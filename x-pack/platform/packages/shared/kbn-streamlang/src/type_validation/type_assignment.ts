/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldType, PrimitiveType, TypeState, TypeAssumption } from './types';
import { isPrimitiveType, isTypeofPlaceholder, mergeTypeofPlaceholders } from './type_utils';
import { ConditionalTypeChangeError } from './errors';

/**
 * Assign a type to a field in the type state.
 * Handles all type assignment logic including:
 * - Primitive type assignments
 * - Typeof placeholder creation and merging
 * - Conditional vs unconditional type changes
 * - Recording assumptions
 */
export function assignType(
  fieldName: string,
  newType: FieldType,
  state: TypeState,
  assumptions: TypeAssumption[],
  processorIndex: number,
  isConditional: boolean,
  reason: string,
  customIdentifier?: string
): void {
  const existing = state.get(fieldName);

  // Case 1: Field doesn't exist yet - create it
  if (!existing) {
    state.set(fieldName, {
      currentType: newType,
      allAssignments: [{ type: newType, processorIndex, isConditional, customIdentifier }],
    });
    return;
  }

  const currentType = existing.currentType;

  // Case 2: Same type - just record the assignment
  if (currentType === newType) {
    existing.allAssignments.push({
      type: newType,
      processorIndex,
      isConditional,
      customIdentifier,
    });
    return;
  }

  // Case 3: Both are primitive types
  if (isPrimitiveType(currentType) && isPrimitiveType(newType)) {
    // Different primitive types
    // Record the assignment first (for validation later)
    existing.allAssignments.push({
      type: newType,
      processorIndex,
      isConditional,
      customIdentifier,
    });

    if (!isConditional) {
      // Unconditional type change is OK - update the current type
      existing.currentType = newType;
    }
    // If conditional, keep current type but record the assignment
    // Validation will happen later in validateNoConditionalTypeChanges
    return;
  }

  // Case 4: Current is primitive, new is typeof
  if (isPrimitiveType(currentType) && isTypeofPlaceholder(newType)) {
    // Record assumption that typeof equals the current primitive type
    assumptions.push({
      placeholder: newType,
      assumedType: currentType,
      reason: `${reason} (field '${fieldName}' has type '${currentType}')`,
    });
    // Keep the primitive type
    existing.allAssignments.push({
      type: currentType,
      processorIndex,
      isConditional,
      customIdentifier,
    });
    return;
  }

  // Case 5: Current is typeof, new is primitive
  if (isTypeofPlaceholder(currentType) && isPrimitiveType(newType)) {
    // Record assumption that typeof equals the new primitive type
    assumptions.push({
      placeholder: currentType,
      assumedType: newType,
      reason: `${reason} (field '${fieldName}' assigned to '${newType}')`,
    });
    // Update to primitive type
    existing.currentType = newType;
    existing.allAssignments.push({
      type: newType,
      processorIndex,
      isConditional,
      customIdentifier,
    });
    return;
  }

  // Case 6: Both are typeof placeholders - merge them
  if (isTypeofPlaceholder(currentType) && isTypeofPlaceholder(newType)) {
    const mergedPlaceholder = mergeTypeofPlaceholders(currentType, newType);

    // Record assumption that these types are equal
    assumptions.push({
      placeholder: mergedPlaceholder,
      assumedType: mergedPlaceholder, // Self-reference indicates equality
      reason: `${reason} (merging ${currentType} and ${newType})`,
    });

    existing.currentType = mergedPlaceholder;
    existing.allAssignments.push({
      type: mergedPlaceholder,
      processorIndex,
      isConditional,
      customIdentifier,
    });
    return;
  }

  // Should never reach here
  throw new Error(
    `Unexpected type assignment: field '${fieldName}', current type '${currentType}', new type '${newType}'`
  );
}

/**
 * Get the current type of a field, or create a typeof placeholder if it doesn't exist.
 */
export function getOrCreateFieldType(fieldName: string, state: TypeState): FieldType {
  const existing = state.get(fieldName);
  if (existing) {
    return existing.currentType;
  }

  // Create a typeof placeholder for unknown fields
  const placeholder: FieldType = `typeof_${fieldName}`;
  return placeholder;
}

/**
 * Validate that no field has conditional type changes.
 * This should be called after all assignments are done.
 *
 * The validation tracks type progression and only flags conditional assignments
 * that would change the type from what it was immediately before the conditional.
 *
 * Example that's OK:
 *   1. field = "string" (unconditional, type: string)
 *   2. field = 123 (unconditional, type: number)
 *   3. field = 456 (conditional, type: number) <- OK, matches current type
 *
 * Example that's NOT OK:
 *   1. field = "string" (unconditional, type: string)
 *   2. field = 123 (conditional, type: number) <- ERROR, changes from string
 */
export function validateNoConditionalTypeChanges(state: TypeState): void {
  const entries = Array.from(state.entries());
  for (const [fieldName, fieldInfo] of entries) {
    const { allAssignments } = fieldInfo;

    // Sort assignments by processor index to process them in order
    const sortedAssignments = [...allAssignments].sort(
      (a, b) => a.processorIndex - b.processorIndex
    );

    // Track the current type as we process assignments
    let currentType: FieldType | undefined;
    const conditionalTypes = new Set<PrimitiveType>();

    for (const assignment of sortedAssignments) {
      if (!assignment.isConditional) {
        // Unconditional assignment updates the current type
        currentType = assignment.type;
      } else {
        // Conditional assignment
        if (isPrimitiveType(assignment.type)) {
          conditionalTypes.add(assignment.type);

          // If we have a current type and it's different, that's an error
          if (currentType && isPrimitiveType(currentType) && currentType !== assignment.type) {
            // Found a conditional assignment that changes the type
            const conflictingTypes = new Set([currentType, assignment.type]);
            const conflictingAssignments = sortedAssignments.filter(
              (a) =>
                isPrimitiveType(a.type) && (a.type === currentType || a.type === assignment.type)
            );
            const conflictingIndices = conflictingAssignments.map((a) => a.processorIndex);
            const conflictingIdentifiers = conflictingAssignments.map((a) => a.customIdentifier);

            throw new ConditionalTypeChangeError(
              fieldName,
              Array.from(conflictingTypes) as PrimitiveType[],
              conflictingIndices,
              conflictingIdentifiers
            );
          }
        }
      }
    }

    // Also check if there are multiple different conditional types
    // (even without an unconditional type set first)
    if (conditionalTypes.size > 1) {
      const typesArray = Array.from(conditionalTypes);
      const conditionalAssignments = sortedAssignments.filter(
        (a) => a.isConditional && isPrimitiveType(a.type)
      );
      const indices = conditionalAssignments.map((a) => a.processorIndex);
      const identifiers = conditionalAssignments.map((a) => a.customIdentifier);

      throw new ConditionalTypeChangeError(fieldName, typesArray, indices, identifiers);
    }
  }
}

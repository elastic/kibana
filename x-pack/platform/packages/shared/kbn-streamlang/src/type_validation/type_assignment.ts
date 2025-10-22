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
  reason: string
): void {
  const existing = state.get(fieldName);

  // Case 1: Field doesn't exist yet - create it
  if (!existing) {
    state.set(fieldName, {
      currentType: newType,
      allAssignments: [{ type: newType, processorIndex, isConditional }],
    });
    return;
  }

  const currentType = existing.currentType;

  // Case 2: Same type - just record the assignment
  if (currentType === newType) {
    existing.allAssignments.push({ type: newType, processorIndex, isConditional });
    return;
  }

  // Case 3: Both are primitive types
  if (isPrimitiveType(currentType) && isPrimitiveType(newType)) {
    // Different primitive types
    // Record the assignment first (for validation later)
    existing.allAssignments.push({ type: newType, processorIndex, isConditional });

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
    existing.allAssignments.push({ type: currentType, processorIndex, isConditional });
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
    existing.allAssignments.push({ type: newType, processorIndex, isConditional });
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
    existing.allAssignments.push({ type: mergedPlaceholder, processorIndex, isConditional });
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
 */
export function validateNoConditionalTypeChanges(state: TypeState): void {
  const entries = Array.from(state.entries());
  for (const [fieldName, fieldInfo] of entries) {
    const { allAssignments } = fieldInfo;

    // Group assignments by whether they're conditional
    const conditionalAssignments = allAssignments.filter((a) => a.isConditional);
    const unconditionalAssignments = allAssignments.filter((a) => !a.isConditional);

    // Get unique primitive types from conditional assignments
    const conditionalPrimitiveTypes = conditionalAssignments
      .map((a) => a.type)
      .filter(isPrimitiveType);
    const conditionalTypes = new Set(conditionalPrimitiveTypes);

    // If there are multiple different primitive types in conditional assignments, error
    if (conditionalTypes.size > 1) {
      const typesArray = Array.from(conditionalTypes) as PrimitiveType[];
      const indices = conditionalAssignments
        .filter((a) => isPrimitiveType(a.type))
        .map((a) => a.processorIndex);

      throw new ConditionalTypeChangeError(fieldName, typesArray, indices);
    }

    // Check if conditional and unconditional assignments have different primitive types
    const unconditionalPrimitiveTypes = unconditionalAssignments
      .map((a) => a.type)
      .filter(isPrimitiveType);
    const unconditionalTypes = new Set(unconditionalPrimitiveTypes);

    if (conditionalTypes.size > 0 && unconditionalTypes.size > 0) {
      const conditionalTypesArray = Array.from(conditionalTypes);
      const unconditionalTypesArray = Array.from(unconditionalTypes);
      const conditionalType = conditionalTypesArray[0] as PrimitiveType;
      const hasConflict = unconditionalTypesArray.some((t) => t !== conditionalType);

      if (hasConflict) {
        const uniqueTypes = new Set([...conditionalTypesArray, ...unconditionalTypesArray]);
        const allTypes = Array.from(uniqueTypes);
        const allIndices = allAssignments
          .filter((a) => isPrimitiveType(a.type))
          .map((a) => a.processorIndex);

        throw new ConditionalTypeChangeError(fieldName, allTypes as PrimitiveType[], allIndices);
      }
    }
  }
}

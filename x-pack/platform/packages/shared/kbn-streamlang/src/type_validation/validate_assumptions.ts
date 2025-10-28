/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeAssumption, PrimitiveType, TypeofPlaceholder } from './types';
import { isPrimitiveType, extractFieldsFromPlaceholder } from './type_utils';
import { AssumptionConflictError } from './assumption_conflict_error';

/**
 * Validate that all assumptions are consistent and don't conflict.
 * Throws AssumptionConflictError if conflicts are found.
 */
export function validateAssumptions(assumptions: TypeAssumption[]): void {
  // Build a map of placeholder -> concrete type assumptions
  const placeholderToTypes = new Map<string, Set<PrimitiveType>>();

  for (const assumption of assumptions) {
    const { placeholder, assumedType } = assumption;

    // Extract all field names from the placeholder
    const fieldNames = extractFieldsFromPlaceholder(placeholder);

    // Only track assumptions where the assumed type is a primitive
    if (isPrimitiveType(assumedType)) {
      for (const fieldName of fieldNames) {
        const fieldPlaceholder = `typeof_${fieldName}` as TypeofPlaceholder;

        if (!placeholderToTypes.has(fieldPlaceholder)) {
          placeholderToTypes.set(fieldPlaceholder, new Set());
        }

        placeholderToTypes.get(fieldPlaceholder)!.add(assumedType);
      }
    }
  }

  // Check for conflicts: same placeholder assumed to be different types
  const entries = Array.from(placeholderToTypes.entries());
  for (const [placeholder, types] of entries) {
    if (types.size > 1) {
      // Found a conflict - this placeholder is assumed to be multiple different types
      const conflictingAssumptions = assumptions.filter((a) => {
        const fieldNames = extractFieldsFromPlaceholder(a.placeholder);
        const fieldPlaceholder = `typeof_${fieldNames[0]}` as TypeofPlaceholder;
        return fieldPlaceholder === placeholder && isPrimitiveType(a.assumedType);
      });

      throw new AssumptionConflictError(placeholder as TypeofPlaceholder, conflictingAssumptions);
    }
  }

  // Check for merged placeholder conflicts
  // If a merged placeholder (e.g., typeof_a,b) has assumptions,
  // make sure the individual fields don't have conflicting assumptions
  for (const assumption of assumptions) {
    const { placeholder, assumedType } = assumption;

    // Skip non-merged placeholders and non-primitive assumptions
    if (!placeholder.includes(',') || !isPrimitiveType(assumedType)) {
      continue;
    }

    // Extract individual field names
    const fieldNames = extractFieldsFromPlaceholder(placeholder);

    // Check if any individual field has a different type assumption
    for (const fieldName of fieldNames) {
      const fieldPlaceholder = `typeof_${fieldName}` as TypeofPlaceholder;
      const fieldTypes = placeholderToTypes.get(fieldPlaceholder);

      if (fieldTypes && fieldTypes.size > 0) {
        const fieldTypesArray = Array.from(fieldTypes);
        if (fieldTypesArray.length > 1 || !fieldTypesArray.includes(assumedType)) {
          // Conflict: merged placeholder assumes one type,
          // but individual field assumes a different type
          const conflictingAssumptions = assumptions.filter(
            (a) =>
              (a.placeholder === placeholder && isPrimitiveType(a.assumedType)) ||
              (a.placeholder === fieldPlaceholder && isPrimitiveType(a.assumedType))
          );

          throw new AssumptionConflictError(placeholder, conflictingAssumptions);
        }
      }
    }
  }
}

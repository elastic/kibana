/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamlangDSL } from '../../types/streamlang';
import type { TypeState, TypeAssumption, TypeValidationResult } from './types';
import { normalizeToPrimitive } from './type_utils';
import { assignType, validateNoConditionalTypeChanges } from './type_assignment';
import { flattenStepsWithTracking } from './flatten_steps_with_tracking';
import { processProcessor } from './processors';
import { validateAssumptions } from './validate_assumptions';

/**
 * Validate types in a Streamlang DSL.
 *
 * @param streamlang - The Streamlang DSL to validate
 * @param startingFieldTypes - Known field types at the start (field name -> type string)
 * @returns Validation result with assumptions and final field types
 * @throws ConditionalTypeChangeError if a field has conditional type changes
 * @throws AssumptionConflictError if assumptions about typeof placeholders conflict
 */
export function validateTypes(
  streamlang: StreamlangDSL,
  startingFieldTypes: Record<string, string> = {}
): TypeValidationResult {
  // Initialize type state with starting field types
  const state: TypeState = new Map();
  const assumptions: TypeAssumption[] = [];

  // Populate initial state with starting field types (normalized to primitives)
  for (const [fieldName, typeString] of Object.entries(startingFieldTypes)) {
    const primitiveType = normalizeToPrimitive(typeString);
    assignType(
      fieldName,
      primitiveType,
      state,
      assumptions,
      -1, // Use -1 for initial types
      false,
      `initial type: '${fieldName}' is ${primitiveType}`
    );
  }

  // Flatten steps while tracking conditional status
  const flattenedSteps = flattenStepsWithTracking(streamlang.steps);

  // Process each processor sequentially
  for (let i = 0; i < flattenedSteps.length; i++) {
    const { processor, isConditional } = flattenedSteps[i];
    processProcessor(processor, state, assumptions, i, isConditional);
  }

  // Validate no conditional type changes
  validateNoConditionalTypeChanges(state);

  // Validate all assumptions are consistent
  validateAssumptions(assumptions);

  // Build final field types map
  const fieldTypes: Record<string, import('./types').FieldType> = {};
  for (const [fieldName, fieldInfo] of state.entries()) {
    fieldTypes[fieldName] = fieldInfo.currentType;
  }

  // Return the validation result
  return {
    assumptions,
    fieldTypes,
  };
}

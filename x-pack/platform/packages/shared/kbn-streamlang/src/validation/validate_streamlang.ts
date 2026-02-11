/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamlangDSL } from '../../types/streamlang';
import { flattenSteps } from '../transpilers/shared/flatten_steps';
import type {
  FieldType,
  FieldTypeMap,
  StreamlangValidationError,
  StreamlangValidationOptions,
  StreamlangValidationResult,
} from './types';
import { validateStepsRecursively } from './validate_structural';
import { trackFieldTypesAndValidate } from './validate_types';
import { validateProcessorValues } from './validate_processor_values';
import { validateCondition } from './validate_conditions';
import { validateNamespacing, validateReservedFields } from './validate_namespacing';

export type { FieldType, FieldTypeMap, StreamlangValidationError };
export type { StreamlangValidationOptions, StreamlangValidationResult };
export { validationErrorTypeLabels, KEEP_FIELDS, NAMESPACE_PREFIXES } from './constants';

/**
 * Validates a Streamlang DSL for condition completeness, processor values, and (for wired streams)
 * namespacing requirements, reserved field usage, and type safety.
 *
 * For ALL streams, this validates that:
 * - Field names don't contain illegal characters (brackets)
 * - remove_by_prefix is not used within where blocks
 * - Conditions are complete (all required values filled, range conditions have both bounds)
 * - Processor-specific values are valid (expressions, patterns, date formats etc.)
 *
 * For WIRED streams only (streamType: 'wired'), this additionally validates that:
 * - manual_ingest_pipeline processors are not used (forbidden in wired streams)
 * - All generated fields are properly namespaced (contain at least one dot)
 * - Custom fields are placed in approved namespaces like: attributes, body.structured, resource.attributes
 * - Processors don't modify reserved/system fields
 * - Fields are used with compatible types
 *
 * @param streamlangDSL - The Streamlang DSL to validate
 * @param options - Validation options (reservedFields, streamType)
 * @returns Validation result with any errors found
 */
export function validateStreamlang(
  streamlangDSL: StreamlangDSL,
  options: StreamlangValidationOptions
): StreamlangValidationResult {
  const { reservedFields, streamType = 'wired' } = options;
  const errors: StreamlangValidationError[] = [];
  let fieldTypesByProcessor = new Map<string, FieldTypeMap>();

  // 1. Validate structural rules:
  //    - For wired streams: No manual_ingest_pipeline processors (forbidden)
  //    - For all streams: No remove_by_prefix within where blocks
  //    - For all streams: No illegal characters (brackets) in field names
  const processorCounter = { count: 0 };
  validateStepsRecursively(streamlangDSL.steps, errors, processorCounter, streamType);

  // 2. Flatten the steps to get all processors with their conditions resolved
  const flattenedSteps = flattenSteps(streamlangDSL.steps);

  // 3. Track field types and validate type usage (only for wired streams)
  if (streamType === 'wired') {
    const typeResult = trackFieldTypesAndValidate(flattenedSteps);
    errors.push(...typeResult.errors);
    fieldTypesByProcessor = typeResult.fieldTypesByProcessor;
  }

  // 4. Validate each processor
  for (let i = 0; i < flattenedSteps.length; i++) {
    const step = flattenedSteps[i];

    if (!step) {
      continue;
    }

    const processorId = step.customIdentifier || `${step.action}_${i}`;
    const processorNumber = i + 1;

    // 4a. Validate processor-specific values (applies to all streams)
    const valueErrors = validateProcessorValues(step, processorNumber, processorId);
    errors.push(...valueErrors);

    // 4b. Validate conditions (applies to all streams)
    if ('where' in step && step.where) {
      const conditionErrors = validateCondition(step.where, processorNumber, processorId);
      errors.push(...conditionErrors);
    }

    // 4c. Wired stream specific validations
    if (streamType === 'wired') {
      // Validate namespacing
      const namespaceErrors = validateNamespacing(step, processorNumber, processorId);
      errors.push(...namespaceErrors);

      // Validate reserved fields
      const reservedErrors = validateReservedFields(
        step,
        processorNumber,
        processorId,
        reservedFields
      );
      errors.push(...reservedErrors);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    fieldTypesByProcessor,
  };
}

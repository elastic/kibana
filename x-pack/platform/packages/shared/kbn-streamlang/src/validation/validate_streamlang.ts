/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { StreamlangDSL } from '../../types/streamlang';
import type { StreamlangProcessorDefinition } from '../../types/processors';
import { flattenSteps } from '../transpilers/shared/flatten_steps';
import { isAlwaysCondition } from '../../types/conditions';
import type { Condition } from '../../types/conditions';
import { isConditionComplete } from '../conditions/helpers';
import { parseGrokPattern, parseDissectPattern } from '../../types/utils';
import {
  inferMathExpressionReturnType,
  extractFieldsFromMathExpression,
  validateMathExpression,
} from '../transpilers/shared/math';

/**
 * Supported field types for type tracking
 */
export type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'unknown';

/**
 * Map of field names to their inferred types
 */
export type FieldTypeMap = Map<string, FieldType>;

export interface StreamlangValidationError {
  type:
    | 'non_namespaced_field'
    | 'reserved_field'
    | 'type_mismatch'
    | 'mixed_type'
    | 'invalid_value';
  message: string;
  processorId?: string;
  field: string;
  expectedType?: FieldType | FieldType[];
  actualType?: FieldType;
  conflictingTypes?: FieldType[];
}

/**
 * Human-readable labels for validation error types
 */
export const validationErrorTypeLabels = {
  non_namespaced_field: i18n.translate('xpack.streamlang.validation.nonNamespacedField', {
    defaultMessage: 'Non-namespaced field',
  }),
  reserved_field: i18n.translate('xpack.streamlang.validation.reservedField', {
    defaultMessage: 'Reserved field',
  }),
  type_mismatch: i18n.translate('xpack.streamlang.validation.typeMismatch', {
    defaultMessage: 'Type mismatch',
  }),
  mixed_type: i18n.translate('xpack.streamlang.validation.mixedType', {
    defaultMessage: 'Mixed type',
  }),
  invalid_value: i18n.translate('xpack.streamlang.validation.invalidValue', {
    defaultMessage: 'Invalid value',
  }),
};

export interface StreamlangValidationOptions {
  /**
   * List of reserved/forbidden field names that cannot be modified by processors
   */
  reservedFields: string[];
  streamType?: 'classic' | 'wired';
}

export interface StreamlangValidationResult {
  isValid: boolean;
  errors: StreamlangValidationError[];
  /**
   * Field types available at each processor (indexed by processorId).
   * This represents the field types that exist BEFORE the processor runs,
   * which is useful for field selection in the UI.
   */
  fieldTypesByProcessor: Map<string, FieldTypeMap>;
}

/**
 * List of special fields that are allowed without namespacing (from kbn-streams-schema)
 * These are OTel standard fields that don't require custom namespace prefixes
 */
export const KEEP_FIELDS = [
  '@timestamp',
  'observed_timestamp',
  'trace_id',
  'span_id',
  'severity_text',
  'body',
  'severity_number',
  'event_name',
  'dropped_attributes_count',
  'scope',
  'body.text',
  'body.structured',
  'resource.schema_url',
  'resource.dropped_attributes_count',
] as const;

/**
 * Valid namespace prefixes for custom fields in wired streams
 */
export const NAMESPACE_PREFIXES = [
  'body.structured.',
  'attributes.',
  'scope.attributes.',
  'resource.attributes.',
] as const;

/**
 * Check if a field is a namespaced ECS field or an allowed keep field.
 * Based on the logic from @kbn/streams-schema/src/helpers/namespaced_ecs.ts
 *
 * Namespaced ECS fields follow the pattern: namespace.field or namespace.nested.field
 * Examples: attributes.custom, body.structured.data, resource.attributes.host
 *
 * Keep fields are special fields that are allowed without namespacing:
 * @timestamp, trace_id, span_id, severity_text, body, severity_number, event_name, etc.
 */
function isNamespacedEcsField(fieldName: string): boolean {
  // Check if it's a keep field
  if (KEEP_FIELDS.includes(fieldName as any)) {
    return true;
  }

  // Check if it starts with a namespace prefix
  return NAMESPACE_PREFIXES.some((prefix) => fieldName.startsWith(prefix));
}

/**
 * Check if a processor has a conditional execution (where clause that's not always).
 * Returns true if the processor may not execute for all documents.
 */
function isConditionalProcessor(processor: StreamlangProcessorDefinition): boolean {
  // Type guard to check if processor has where property
  if (!('where' in processor) || !processor.where) {
    return false;
  }
  return !isAlwaysCondition(processor.where);
}

/**
 * Extract field references from a processor.
 * This identifies fields that are being set/modified by the processor.
 */
function extractModifiedFields(processor: StreamlangProcessorDefinition): string[] {
  const fields: string[] = [];

  // Handle each processor type specifically
  switch (processor.action) {
    case 'rename':
      // For rename processor, only the 'to' field is modified
      if (processor.to) {
        fields.push(processor.to);
      }
      break;

    case 'set':
    case 'append':
      // For set/append, the 'to' field is modified
      if (processor.to) {
        fields.push(processor.to);
      }
      break;

    case 'grok':
      // For grok processor, extract pattern field names using the helper
      if (processor.patterns) {
        const patterns = Array.isArray(processor.patterns)
          ? processor.patterns
          : [processor.patterns];
        patterns.forEach((pattern: string) => {
          const extractedFields = parseGrokPattern(pattern);
          extractedFields.forEach((field) => {
            fields.push(field.name);
          });
        });
      }
      break;

    case 'dissect':
      // For dissect processor, extract pattern field names using the helper
      if (processor.pattern) {
        const extractedFields = parseDissectPattern(processor.pattern);
        extractedFields.forEach((field) => {
          fields.push(field.name);
        });
      }
      break;

    case 'convert':
      // For convert processor, if no 'to' field, it modifies 'from' in place
      if (processor.to) {
        fields.push(processor.to);
      } else if (processor.from) {
        fields.push(processor.from);
      }
      break;

    case 'uppercase':
    case 'lowercase':
    case 'trim':
      // Uppercase, lowercase, and trim processors can have optional 'to' field, defaults to modifying 'from' in place
      if (processor.to) {
        fields.push(processor.to);
      } else if (processor.from) {
        fields.push(processor.from);
      }
      break;

    case 'date':
      // Date processor can have optional 'to' field, defaults to @timestamp
      if (processor.to) {
        fields.push(processor.to);
      }
      break;

    case 'replace':
      // Replace processor can have optional 'to' field, defaults to modifying 'from' in place
      if (processor.to) {
        fields.push(processor.to);
      } else if (processor.from) {
        fields.push(processor.from);
      }
      break;

    case 'math':
      // Math processor writes result to 'to' field
      if (processor.to) {
        fields.push(processor.to);
      }
      break;

    case 'join':
      if (processor.to) {
        fields.push(processor.to);
      }
      break;

    case 'remove':
    case 'remove_by_prefix':
    case 'drop_document':
    case 'manual_ingest_pipeline':
      // These processors don't create new fields, they remove or drop
      break;
    default: {
      const _exhaustiveCheck: never = processor;
      return _exhaustiveCheck;
    }
  }

  return fields;
}

/**
 * Infer the type of a value from its JavaScript type.
 * Used for static values in the Streamlang DSL (e.g., set processor values).
 * @throws {Error} if value is null
 */
function inferTypeFromValue(value: unknown): FieldType {
  if (value === null) {
    throw new Error('Null values are not supported in type inference');
  }
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  return 'unknown';
}

/**
 * Map convert processor types to field types
 */
function convertTypeToFieldType(convertType: string): FieldType {
  switch (convertType) {
    case 'string':
      return 'string';
    case 'integer':
    case 'long':
    case 'double':
    case 'float':
      return 'number';
    case 'boolean':
      return 'boolean';
    default:
      return 'unknown';
  }
}

/**
 * Get the expected output type for each processor action.
 * This tracks what type a field becomes after being processed.
 */
function getProcessorOutputType(
  processor: StreamlangProcessorDefinition,
  fieldName: string
): FieldType {
  switch (processor.action) {
    case 'grok':
      // Grok type depends ONLY on explicit :type suffix (e.g., %{NUMBER:count:int})
      // Format: %{PATTERN:fieldname} produces string
      // Format: %{PATTERN:fieldname:type} produces the specified type
      if (processor.patterns) {
        const patterns = Array.isArray(processor.patterns)
          ? processor.patterns
          : [processor.patterns];
        for (const pattern of patterns) {
          // Extract pattern for this specific field: %{PATTERN:fieldname} or %{PATTERN:fieldname:type}
          const regex = new RegExp(
            `%\\{([^:}]+):${fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?::([^}]+))?\\}`,
            'g'
          );
          const match = regex.exec(pattern);
          if (match) {
            // If explicit type cast is specified (e.g., :int, :float), use that
            if (match[2]) {
              const explicitType = match[2].toLowerCase();
              if (
                explicitType === 'int' ||
                explicitType === 'long' ||
                explicitType === 'float' ||
                explicitType === 'double'
              ) {
                return 'number';
              }
              if (explicitType === 'boolean') {
                return 'boolean';
              }
              // Unknown type suffix defaults to string
              return 'string';
            }
            // No explicit type cast = always string (regardless of pattern name)
            return 'string';
          }
        }
      }
      // Default to string if pattern not found
      return 'string';

    case 'dissect':
    case 'replace':
    case 'uppercase':
    case 'lowercase':
    case 'trim':
      // Dissect, replace, uppercase, lowercase, and trim always produce string output
      return 'string';

    case 'date':
      // Date processor produces date type
      return 'date';

    case 'convert':
      // Convert processor changes type to specified target
      if (processor.type) {
        return convertTypeToFieldType(processor.type);
      }
      return 'unknown';

    case 'set':
      // Set processor type can be inferred from the value if it's a static value
      if (processor.value !== undefined) {
        return inferTypeFromValue(processor.value);
      }
      // If copying from another field, we don't know the type
      return 'unknown';

    case 'rename':
      // Rename keeps the same type (will be inferred from source)
      return 'unknown';

    case 'append':
      // Append creates or modifies arrays - not tracking array types for now
      return 'unknown';

    case 'math':
      // Math processor output type depends on the expression
      // Comparison expressions (eq, neq, lt, lte, gt, gte) return boolean
      // All other expressions return number
      return inferMathExpressionReturnType(processor.expression);

    case 'join':
      return 'string';

    case 'remove':
    case 'remove_by_prefix':
    case 'drop_document':
    case 'manual_ingest_pipeline':
      // These processors don't produce typed output or type is unknown
      return 'unknown';
    default: {
      const _exhaustiveCheck: never = processor;
      return _exhaustiveCheck;
    }
  }
}

/**
 * Check if a processor uses a field in a way that requires a specific type.
 * Returns the expected type if validation is needed, or null if any type is acceptable.
 */
function getExpectedInputType(
  processor: StreamlangProcessorDefinition,
  fieldName: string
): FieldType[] | null {
  switch (processor.action) {
    case 'date':
      // Date processor expects string input (to parse into date)
      if (processor.from === fieldName) {
        return ['string'];
      }
      return null;

    case 'convert':
      // Convert accepts any type as input (that's the point of conversion)
      return null;

    case 'replace':
      // Replace requires string input
      if (processor.from === fieldName) {
        return ['string'];
      }
      return null;

    case 'grok':
      // Grok requires string input to parse
      if (processor.from === fieldName) {
        return ['string'];
      }
      return null;

    case 'dissect':
      // Dissect requires string input to parse
      if (processor.from === fieldName) {
        return ['string'];
      }
      return null;

    case 'math':
      // Math expressions expect numeric inputs for all field references
      // (logical operators &&, ||, ! are not supported, so no boolean inputs)
      if (extractFieldsFromMathExpression(processor.expression).includes(fieldName)) {
        return ['number'];
      }
      return null;

    case 'uppercase':
    case 'lowercase':
    case 'trim':
      // Uppercase, lowercase, and trim require string input
      if (processor.from === fieldName) {
        return ['string'];
      }
      return null;

    case 'join':
      if (processor.from.some((from) => from === fieldName)) {
        return ['string'];
      }
      return null;

    case 'rename':
    case 'set':
    case 'append':
    case 'remove':
    case 'remove_by_prefix':
    case 'drop_document':
    case 'manual_ingest_pipeline':
      // These processors don't have strict type requirements for their inputs
      return null;
    default: {
      const _exhaustiveCheck: never = processor;
      return _exhaustiveCheck;
    }
  }
}

/**
 * Track field types AND validate type usage through the DSL pipeline.
 * This function builds a map of field names to their types by analyzing each processor,
 * and validates that fields are used correctly based on their current types.
 *
 * It also detects mixed types: when a field has different types in different execution paths.
 * For example, if a conditional processor changes a field's type, that field will have
 * mixed types (the original type + the new type).
 *
 * @param flattenedSteps - The flattened processor steps
 * @returns Object containing the final field type map and any type errors
 */
function trackFieldTypesAndValidate(flattenedSteps: StreamlangProcessorDefinition[]): {
  fieldTypes: FieldTypeMap;
  errors: StreamlangValidationError[];
  fieldTypesByProcessor: Map<string, FieldTypeMap>;
} {
  const fieldTypes = new Map<string, FieldType>();
  // Track all possible types a field can have (across different execution paths)
  const potentialFieldTypes = new Map<string, Set<FieldType>>();
  const errors: StreamlangValidationError[] = [];
  // Track field types available at each processor (BEFORE the processor runs)
  const fieldTypesByProcessor = new Map<string, FieldTypeMap>();

  for (let i = 0; i < flattenedSteps.length; i++) {
    const step = flattenedSteps[i];
    if (!step) continue;

    const processorId = step.customIdentifier || `${step.action}_${i}`;

    // Capture field types BEFORE this processor runs
    fieldTypesByProcessor.set(processorId, new Map(fieldTypes));

    // FIRST: Validate field usage against CURRENT types (before this processor runs)
    const fieldsUsed: string[] = [];

    // Collect fields used as input by this processor
    switch (step.action) {
      case 'date':
      case 'convert':
      case 'replace':
      case 'remove':
      case 'grok':
      case 'dissect':
      case 'uppercase':
      case 'lowercase':
      case 'trim':
        if (step.from) fieldsUsed.push(step.from);
        break;
      case 'rename':
        if (step.from) fieldsUsed.push(step.from);
        break;
      case 'set':
        if (step.copy_from) fieldsUsed.push(step.copy_from);
        break;
      case 'math':
        // Math expressions expect numeric inputs for all field references
        fieldsUsed.push(...extractFieldsFromMathExpression(step.expression));
        break;
      case 'join':
        fieldsUsed.push(...step.from);
        break;
      case 'append':
      case 'drop_document':
      case 'manual_ingest_pipeline':
      case 'remove_by_prefix':
        // These processors don't use specific fields in a way that requires type validation
        break;
      default: {
        const _exhaustiveCheck: never = step;
        return _exhaustiveCheck;
      }
    }

    // Validate each field usage against current types
    for (const field of fieldsUsed) {
      const expectedTypes = getExpectedInputType(step, field);
      if (expectedTypes) {
        const actualType = fieldTypes.get(field);
        if (actualType && actualType !== 'unknown' && !expectedTypes.includes(actualType)) {
          errors.push({
            type: 'type_mismatch',
            message: i18n.translate('xpack.streamlang.validation.typeMismatchMessage', {
              defaultMessage:
                'Processor #{processorNumber} ({processorAction}) expects field "{fieldName}" to be of type {expectedTypes}, but it has type {actualType}',
              values: {
                processorNumber: i + 1,
                processorAction: step.action,
                fieldName: field,
                expectedTypes: expectedTypes.join(' or '),
                actualType,
              },
            }),
            processorId,
            field,
            expectedType: expectedTypes.length === 1 ? expectedTypes[0] : expectedTypes,
            actualType,
          });
        }
      }
    }

    // Check for duplicate fields with different types in grok patterns
    if (step.action === 'grok' && step.patterns) {
      const patterns = Array.isArray(step.patterns) ? step.patterns : [step.patterns];
      for (const pattern of patterns) {
        // Extract all occurrences of each field in this pattern with their types
        const fieldOccurrences = new Map<string, Set<string>>();
        const regex = /%\{([^:}]+):([^:}]+)(?::([^}]+))?\}/g;
        let match: RegExpExecArray | null;

        while ((match = regex.exec(pattern)) !== null) {
          const fieldName = match[2]?.trim();
          const typeModifier = match[3]?.trim().toLowerCase();

          if (!fieldName) continue;

          // Determine the type for this occurrence
          let occurrenceType: string;
          if (typeModifier) {
            if (['int', 'long', 'float', 'double'].includes(typeModifier)) {
              occurrenceType = 'number';
            } else if (typeModifier === 'boolean') {
              occurrenceType = 'boolean';
            } else {
              occurrenceType = 'string';
            }
          } else {
            occurrenceType = 'string';
          }

          if (!fieldOccurrences.has(fieldName)) {
            fieldOccurrences.set(fieldName, new Set());
          }
          fieldOccurrences.get(fieldName)!.add(occurrenceType);
        }

        // Check if any field has multiple different types
        for (const [fieldName, types] of fieldOccurrences.entries()) {
          if (types.size > 1) {
            errors.push({
              type: 'mixed_type',
              message: i18n.translate('xpack.streamlang.validation.grokDuplicateFieldTypes', {
                defaultMessage:
                  'Field "{fieldName}" is defined multiple times with different types in grok pattern of processor #{processorNumber}.',
                values: {
                  fieldName,
                  processorNumber: i + 1,
                  types: Array.from(types).join(', '),
                },
              }),
              processorId,
              field: fieldName,
            });
          }
        }
      }
    }

    // SECOND: Update types based on what this processor produces
    const modifiedFields = extractModifiedFields(step);
    const isConditional = isConditionalProcessor(step);

    for (const field of modifiedFields) {
      const outputType = getProcessorOutputType(step, field);
      if (outputType !== 'unknown') {
        const currentType = fieldTypes.get(field);

        // If this is a conditional processor
        if (isConditional) {
          // Track that this field can have multiple types
          const existingPotentialTypes = potentialFieldTypes.get(field) || new Set();

          // Add the current type (field might not be modified)
          if (currentType) {
            existingPotentialTypes.add(currentType);
          }
          // Add the new output type (field might be modified)
          existingPotentialTypes.add(outputType);

          potentialFieldTypes.set(field, existingPotentialTypes);

          // If the field now has multiple different types, that's a mixed type error
          if (existingPotentialTypes.size > 1) {
            errors.push({
              type: 'mixed_type',
              message: i18n.translate('xpack.streamlang.validation.mixedTypeMessage', {
                defaultMessage:
                  'Field "{fieldName}" has mixed types due to conditional processor #{processorNumber} ({processorAction}). It can be {conflictingTypes}, which makes downstream usage ambiguous.',
                values: {
                  fieldName: field,
                  processorNumber: i + 1,
                  processorAction: step.action,
                  conflictingTypes: Array.from(existingPotentialTypes).join(' or '),
                },
              }),
              processorId,
              field,
              conflictingTypes: Array.from(existingPotentialTypes),
            });
          }

          // Don't update fieldTypes for conditional processors - we keep the "before" type
          // because the processor might not execute
        } else {
          // Unconditional processor - always updates the type
          fieldTypes.set(field, outputType);
          // Update potential types to only have this new type
          potentialFieldTypes.set(field, new Set([outputType]));
        }
      }
    }

    // For rename processor, copy the type from source to target
    if (step.action === 'rename' && step.from && step.to) {
      const sourceType = fieldTypes.get(step.from);
      if (sourceType) {
        fieldTypes.set(step.to, sourceType);
      }
    }

    // For set processor with copy_from, copy the type
    if (step.action === 'set' && step.copy_from && step.to) {
      const sourceType = fieldTypes.get(step.copy_from);
      if (sourceType) {
        fieldTypes.set(step.to, sourceType);
      }
    }
  }

  return { fieldTypes, errors, fieldTypesByProcessor };
}

/**
 * Validates processor-specific values such as expressions, patterns, and date formats etc.
 *
 * @param step - The processor step to validate
 * @param processorNumber - 1-based index for error messages
 * @param processorId - Unique identifier for the processor
 * @returns Array of validation errors for this processor
 */
function validateProcessorValues(
  step: StreamlangProcessorDefinition,
  processorNumber: number,
  processorId: string
): StreamlangValidationError[] {
  const errors: StreamlangValidationError[] = [];

  switch (step.action) {
    case 'math': {
      const mathValidation = validateMathExpression(step.expression);
      if (!mathValidation.valid) {
        for (const syntaxError of mathValidation.errors) {
          errors.push({
            type: 'invalid_value',
            message: i18n.translate('xpack.streamlang.validation.invalidExpressionMessage', {
              defaultMessage:
                'Processor #{processorNumber} ({processorAction}) has an invalid expression: {error}',
              values: {
                processorNumber,
                processorAction: step.action,
                error: syntaxError,
              },
            }),
            processorId,
            field: 'expression',
          });
        }
      }
      break;
    }
    case 'grok':
    case 'dissect':
    case 'date':
    case 'set':
    case 'rename':
    case 'convert':
    case 'append':
    case 'replace':
    case 'remove':
    case 'remove_by_prefix':
    case 'drop_document':
    case 'uppercase':
    case 'lowercase':
    case 'trim':
    case 'join':
    case 'manual_ingest_pipeline':
      // No value validation implemented for these processors yet
      break;
    default: {
      const _exhaustiveCheck: never = step;
      return _exhaustiveCheck;
    }
  }

  return errors;
}

function validateCondition(
  condition: Condition | undefined,
  processorNumber: number,
  processorId: string
): StreamlangValidationError[] {
  const errors: StreamlangValidationError[] = [];

  // Skip if no condition or if it's 'always'
  if (!condition || isAlwaysCondition(condition)) {
    return errors;
  }

  if (!isConditionComplete(condition)) {
    errors.push({
      type: 'invalid_value',
      message: i18n.translate('xpack.streamlang.validation.incompleteCondition', {
        defaultMessage:
          'Processor #{processorNumber} has an incomplete condition: all required values must be filled',
        values: { processorNumber },
      }),
      processorId,
      field: 'where',
    });
  }

  return errors;
}

/**
 * Validates a Streamlang DSL for condition completeness, processor values, and (for wired streams)
 * namespacing requirements, reserved field usage, and type safety.
 *
 * For ALL streams, this validates that:
 * - Conditions are complete (all required values filled, range conditions have both bounds)
 * - Processor-specific values are valid (expressions, patterns, date formats etc.)
 *
 * For WIRED streams only (streamType: 'wired'), this additionally validates that:
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

  // Flatten the steps to get all processors with their conditions resolved
  const flattenedSteps = flattenSteps(streamlangDSL.steps);

  // Track field types and validate type usage (only for wired streams)
  if (streamType === 'wired') {
    const typeResult = trackFieldTypesAndValidate(flattenedSteps);
    // Add type validation errors
    errors.push(...typeResult.errors);
    // Capture field types at each processor
    fieldTypesByProcessor = typeResult.fieldTypesByProcessor;
  }

  // Check each processor
  for (let i = 0; i < flattenedSteps.length; i++) {
    const step = flattenedSteps[i];

    if (!step) {
      continue;
    }

    const processorId = step.customIdentifier || `${step.action}_${i}`;

    // Validate processor-specific values (expressions, patterns, formats, etc.) - applies to all streams
    const valueErrors = validateProcessorValues(step, i + 1, processorId);
    errors.push(...valueErrors);

    // Validate conditions - applies to all streams
    if ('where' in step && step.where) {
      const conditionErrors = validateCondition(step.where, i + 1, processorId);
      errors.push(...conditionErrors);
    }

    // Wired stream specific validations: namespacing and reserved fields
    if (streamType === 'wired') {
      // Extract fields that this processor modifies
      const modifiedFields = extractModifiedFields(step);

      // Validate namespacing for wired streams
      const nonNamespacedFields = modifiedFields.filter((field) => !isNamespacedEcsField(field));

      if (nonNamespacedFields.length > 0) {
        for (const field of nonNamespacedFields) {
          errors.push({
            type: 'non_namespaced_field',
            message: i18n.translate('xpack.streamlang.validation.nonNamespacedFieldMessage', {
              defaultMessage:
                'The field "{fieldName}" generated by processor #{processorNumber} ({processorAction}) does not match the streams recommended schema - put custom fields into attributes, body.structured or resource.attributes',
              values: {
                fieldName: field,
                processorNumber: i + 1,
                processorAction: step.action,
              },
            }),
            processorId,
            field,
          });
        }
      }

      // Validate reserved fields
      if (reservedFields.length > 0) {
        const reservedFieldViolations = modifiedFields.filter((field) =>
          reservedFields.includes(field)
        );

        if (reservedFieldViolations.length > 0) {
          for (const field of reservedFieldViolations) {
            errors.push({
              type: 'reserved_field',
              message: i18n.translate('xpack.streamlang.validation.reservedFieldMessage', {
                defaultMessage:
                  'Processor #{processorNumber} ({processorAction}) is trying to modify reserved field "{fieldName}"',
                values: {
                  processorNumber: i + 1,
                  processorAction: step.action,
                  fieldName: field,
                },
              }),
              processorId,
              field,
            });
          }
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    fieldTypesByProcessor,
  };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamlangDSL } from '../../types/streamlang';
import type { StreamlangProcessorDefinition } from '../../types/processors';
import { flattenSteps } from '../transpilers/shared/flatten_steps';
import { isAlwaysCondition } from '../../types/conditions';

/**
 * Supported field types for type tracking
 */
export type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'unknown';

/**
 * Map of field names to their inferred types
 */
export type FieldTypeMap = Map<string, FieldType>;

export interface StreamlangValidationError {
  type: 'non_namespaced_field' | 'reserved_field' | 'type_mismatch' | 'mixed_type';
  message: string;
  processorId?: string;
  field: string;
  expectedType?: FieldType | FieldType[];
  actualType?: FieldType;
  conflictingTypes?: FieldType[];
}

export interface StreamlangValidationOptions {
  /**
   * Whether to validate for wired streams (requires namespaced fields)
   */
  isWiredStream?: boolean;
  /**
   * List of reserved/forbidden field names that cannot be modified by processors
   */
  reservedFields?: string[];
  /**
   * Whether to perform type checking on field usage
   */
  validateTypes?: boolean;
  /**
   * Initial field types (e.g., from parent stream or existing fields)
   */
  initialFieldTypes?: FieldTypeMap;
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
  // List of special fields that are allowed without namespacing (from kbn-streams-schema)
  const keepFields = [
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
  ];

  // Check if it's a keep field
  if (keepFields.includes(fieldName)) {
    return true;
  }

  // Check if it starts with a namespace prefix
  const namespacePrefixes = [
    'body.structured.',
    'attributes.',
    'scope.attributes.',
    'resource.attributes.',
  ];

  return namespacePrefixes.some((prefix) => fieldName.startsWith(prefix));
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
      // For grok processor, extract pattern field names
      // Pattern format: %{PATTERN:fieldname} or %{PATTERN:fieldname:type}
      if (processor.patterns) {
        const patterns = Array.isArray(processor.patterns)
          ? processor.patterns
          : [processor.patterns];
        patterns.forEach((pattern: string) => {
          // Extract field names from grok patterns: %{PATTERN:fieldname} or %{PATTERN:fieldname:type}
          const matches = pattern.matchAll(/%\{[^:}]+:([^:}]+)(?::[^}]+)?\}/g);
          for (const match of matches) {
            if (match[1]) {
              fields.push(match[1]);
            }
          }
        });
      }
      break;

    case 'dissect':
      // For dissect processor, extract pattern field names
      if (processor.pattern) {
        // Dissect patterns contain field extractions like %{fieldname}
        const matches = processor.pattern.matchAll(/%\{([^}]+)\}/g);
        for (const match of matches) {
          if (match[1] && !match[1].startsWith('+') && !match[1].startsWith('->')) {
            fields.push(match[1]);
          }
        }
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

    case 'remove':
    case 'remove_by_prefix':
    case 'drop_document':
    case 'manual_ingest_pipeline':
      // These processors don't create new fields, they remove or drop
      break;
  }

  return fields;
}

/**
 * Analyze grok pattern to infer field type based on pattern name.
 * Common numeric patterns: NUMBER, INT, POSINT, NONNEGINT, etc.
 */
function inferTypeFromGrokPattern(patternName: string): FieldType {
  const numericPatterns = [
    'NUMBER',
    'INT',
    'POSINT',
    'NONNEGINT',
    'WORD',
    'BASE10NUM',
    'BASE16NUM',
    'FLOAT',
  ];

  if (numericPatterns.includes(patternName.toUpperCase())) {
    return 'number';
  }

  // Default to string for most patterns (IP, WORD, DATA, etc.)
  return 'string';
}

/**
 * Infer the type of a value from its JavaScript type.
 * Used for static values in the Streamlang DSL (e.g., set processor values).
 */
function inferTypeFromValue(value: unknown): FieldType {
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
      // Grok type depends on the pattern and optional :type suffix
      // Format: %{PATTERN:fieldname} or %{PATTERN:fieldname:type}
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
            // If explicit type is specified (e.g., :int, :float), use that
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
              if (explicitType === 'boolean' || explicitType === 'bool') {
                return 'boolean';
              }
              // Default to string for unknown type suffixes
              return 'string';
            }
            // Otherwise infer from pattern name
            if (match[1]) {
              return inferTypeFromGrokPattern(match[1]);
            }
          }
        }
      }
      // Default to string if pattern not found
      return 'string';

    case 'dissect':
    case 'replace':
      // Dissect and replace always produce string output
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

    case 'remove':
    case 'remove_by_prefix':
    case 'drop_document':
    case 'manual_ingest_pipeline':
      // These processors don't produce typed output or type is unknown
      return 'unknown';
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
    case 'dissect':
    case 'rename':
    case 'set':
    case 'append':
    case 'remove':
    case 'remove_by_prefix':
    case 'drop_document':
    case 'manual_ingest_pipeline':
      // These processors don't have strict type requirements for their inputs
      return null;
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
 * @param initialTypes - Initial field types (e.g., from parent stream)
 * @returns Object containing the final field type map and any type errors
 */
function trackFieldTypesAndValidate(
  flattenedSteps: StreamlangProcessorDefinition[],
  initialTypes: FieldTypeMap = new Map()
): {
  fieldTypes: FieldTypeMap;
  errors: StreamlangValidationError[];
  fieldTypesByProcessor: Map<string, FieldTypeMap>;
} {
  const fieldTypes = new Map(initialTypes);
  // Track all possible types a field can have (across different execution paths)
  const potentialFieldTypes = new Map<string, Set<FieldType>>();
  // Initialize potential types with initial types
  for (const [field, type] of initialTypes) {
    potentialFieldTypes.set(field, new Set([type]));
  }
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
        if (step.from) fieldsUsed.push(step.from);
        break;
      case 'rename':
        if (step.from) fieldsUsed.push(step.from);
        break;
      case 'set':
        if (step.copy_from) fieldsUsed.push(step.copy_from);
        break;
    }

    // Validate each field usage against current types
    for (const field of fieldsUsed) {
      const expectedTypes = getExpectedInputType(step, field);
      if (expectedTypes) {
        const actualType = fieldTypes.get(field);
        if (actualType && actualType !== 'unknown' && !expectedTypes.includes(actualType)) {
          errors.push({
            type: 'type_mismatch',
            message: `Processor #${i + 1} (${
              step.action
            }) expects field "${field}" to be of type ${expectedTypes.join(
              ' or '
            )}, but it has type ${actualType}`,
            processorId,
            field,
            expectedType: expectedTypes.length === 1 ? expectedTypes[0] : expectedTypes,
            actualType,
          });
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
              message: `Field "${field}" has mixed types due to conditional processor #${i + 1} (${
                step.action
              }). It can be ${Array.from(existingPotentialTypes).join(
                ' or '
              )}, which makes downstream usage ambiguous.`,
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
 * Track field types through the DSL pipeline (convenience wrapper).
 * This function builds a map of field names to their types by analyzing each processor.
 *
 * @param flattenedSteps - The flattened processor steps
 * @param initialTypes - Initial field types (e.g., from parent stream)
 * @returns Map of field names to their inferred types
 */
export function trackFieldTypes(
  flattenedSteps: StreamlangProcessorDefinition[],
  initialTypes: FieldTypeMap = new Map()
): FieldTypeMap {
  return trackFieldTypesAndValidate(flattenedSteps, initialTypes).fieldTypes;
}

/**
 * Validate type usage across processors (convenience wrapper).
 * Checks if fields are used with compatible types throughout the pipeline.
 *
 * @param flattenedSteps - The flattened processor steps
 * @param fieldTypes - Map of field names to their types
 * @returns Array of type mismatch errors
 */
export function validateTypeUsage(
  flattenedSteps: StreamlangProcessorDefinition[],
  fieldTypes: FieldTypeMap
): StreamlangValidationError[] {
  return trackFieldTypesAndValidate(flattenedSteps, fieldTypes).errors;
}

/**
 * Validates a Streamlang DSL for wired stream requirements, reserved field usage, and type safety.
 *
 * For wired streams, this validates that:
 * - All generated fields are properly namespaced (contain at least one dot)
 * - Custom fields are placed in approved namespaces like: attributes, body.structured, resource.attributes
 *
 * For all streams, this validates that:
 * - Processors don't modify reserved/system fields
 * - Fields are used with compatible types (when validateTypes is enabled)
 *
 * @param streamlangDSL - The Streamlang DSL to validate
 * @param options - Validation options (isWiredStream, reservedFields, validateTypes, initialFieldTypes)
 * @returns Validation result with any errors found
 */
export function validateStreamlang(
  streamlangDSL: StreamlangDSL,
  options: StreamlangValidationOptions = {}
): StreamlangValidationResult {
  const {
    isWiredStream = false,
    reservedFields = [],
    validateTypes = false,
    initialFieldTypes = new Map(),
  } = options;
  const errors: StreamlangValidationError[] = [];
  let fieldTypesByProcessor = new Map<string, FieldTypeMap>();

  // Flatten the steps to get all processors with their conditions resolved
  const flattenedSteps = flattenSteps(streamlangDSL.steps);

  // Track field types and validate type usage if type validation is enabled
  if (validateTypes) {
    const typeResult = trackFieldTypesAndValidate(flattenedSteps, initialFieldTypes);
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

    // Extract fields that this processor modifies
    const modifiedFields = extractModifiedFields(step);

    // Validate namespacing for wired streams
    if (isWiredStream) {
      const nonNamespacedFields = modifiedFields.filter((field) => !isNamespacedEcsField(field));

      if (nonNamespacedFields.length > 0) {
        for (const field of nonNamespacedFields) {
          errors.push({
            type: 'non_namespaced_field',
            message: `The field "${field}" generated by processor #${i + 1} (${
              step.action
            }) does not match the streams recommended schema - put custom fields into attributes, body.structured or resource.attributes`,
            processorId,
            field,
          });
        }
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
            message: `Processor #${i + 1} (${
              step.action
            }) is trying to modify reserved field "${field}"`,
            processorId,
            field,
          });
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

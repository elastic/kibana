/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { StreamlangProcessorDefinition } from '../../types/processors';
import { isAlwaysCondition } from '../../types/conditions';
import { parseGrokPattern, parseDissectPattern } from '../../types/utils';
import {
  inferMathExpressionReturnType,
  extractFieldsFromMathExpression,
} from '../transpilers/shared/math';
import type { FieldType, FieldTypeMap, StreamlangValidationError } from './types';

/**
 * Check if a processor has a conditional execution (where clause that's not always).
 * Returns true if the processor may not execute for all documents.
 */
export function isConditionalProcessor(processor: StreamlangProcessorDefinition): boolean {
  if (!('where' in processor) || !processor.where) {
    return false;
  }
  return !isAlwaysCondition(processor.where);
}

/**
 * Extract field references from a processor.
 * This identifies fields that are being set/modified by the processor.
 */
export function extractModifiedFields(processor: StreamlangProcessorDefinition): string[] {
  const fields: string[] = [];

  switch (processor.action) {
    case 'rename':
      if (processor.to) {
        fields.push(processor.to);
      }
      break;

    case 'set':
    case 'append':
      if (processor.to) {
        fields.push(processor.to);
      }
      break;

    case 'grok':
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
      if (processor.pattern) {
        const extractedFields = parseDissectPattern(processor.pattern);
        extractedFields.forEach((field) => {
          fields.push(field.name);
        });
      }
      break;

    case 'convert':
      if (processor.to) {
        fields.push(processor.to);
      } else if (processor.from) {
        fields.push(processor.from);
      }
      break;

    case 'uppercase':
    case 'lowercase':
    case 'trim':
      if (processor.to) {
        fields.push(processor.to);
      } else if (processor.from) {
        fields.push(processor.from);
      }
      break;

    case 'date':
      if (processor.to) {
        fields.push(processor.to);
      }
      break;

    case 'replace':
      if (processor.to) {
        fields.push(processor.to);
      } else if (processor.from) {
        fields.push(processor.from);
      }
      break;

    case 'redact':
      if (processor.from) {
        fields.push(processor.from);
      }
      break;

    case 'math':
      if (processor.to) {
        fields.push(processor.to);
      }
      break;

    case 'join':
      if (processor.to) {
        fields.push(processor.to);
      }
      break;

    case 'concat':
      if (processor.to) {
        fields.push(processor.to);
      }
      break;

    case 'remove':
    case 'remove_by_prefix':
    case 'drop_document':
    case 'manual_ingest_pipeline':
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
 */
export function getProcessorOutputType(
  processor: StreamlangProcessorDefinition,
  fieldName: string
): FieldType {
  switch (processor.action) {
    case 'grok':
      if (processor.patterns) {
        const patterns = Array.isArray(processor.patterns)
          ? processor.patterns
          : [processor.patterns];
        for (const pattern of patterns) {
          const regex = new RegExp(
            `%\\{([^:}]+):${fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?::([^}]+))?\\}`,
            'g'
          );
          const match = regex.exec(pattern);
          if (match) {
            if (match[2]) {
              const explicitType = match[2].toLowerCase();
              if (['int', 'long', 'float', 'double'].includes(explicitType)) {
                return 'number';
              }
              if (explicitType === 'boolean') {
                return 'boolean';
              }
              return 'string';
            }
            return 'string';
          }
        }
      }
      return 'string';

    case 'dissect':
    case 'replace':
    case 'redact':
    case 'uppercase':
    case 'lowercase':
    case 'trim':
    case 'concat':
      return 'string';

    case 'date':
      return 'date';

    case 'convert':
      if (processor.type) {
        return convertTypeToFieldType(processor.type);
      }
      return 'unknown';

    case 'set':
      if (processor.value !== undefined) {
        return inferTypeFromValue(processor.value);
      }
      return 'unknown';

    case 'rename':
      return 'unknown';

    case 'append':
      return 'unknown';

    case 'math':
      return inferMathExpressionReturnType(processor.expression);

    case 'join':
      return 'string';

    case 'remove':
    case 'remove_by_prefix':
    case 'drop_document':
    case 'manual_ingest_pipeline':
      return 'unknown';
    default: {
      const _exhaustiveCheck: never = processor;
      return _exhaustiveCheck;
    }
  }
}

/**
 * Check if a processor uses a field in a way that requires a specific type.
 */
export function getExpectedInputType(
  processor: StreamlangProcessorDefinition,
  fieldName: string
): FieldType[] | null {
  switch (processor.action) {
    case 'date':
      if (processor.from === fieldName) {
        return ['string'];
      }
      return null;

    case 'convert':
      return null;

    case 'replace':
      if (processor.from === fieldName) {
        return ['string'];
      }
      return null;

    case 'redact':
      if (processor.from === fieldName) {
        return ['string'];
      }
      return null;

    case 'grok':
      if (processor.from === fieldName) {
        return ['string'];
      }
      return null;

    case 'dissect':
      if (processor.from === fieldName) {
        return ['string'];
      }
      return null;

    case 'math':
      if (extractFieldsFromMathExpression(processor.expression).includes(fieldName)) {
        return ['number'];
      }
      return null;

    case 'uppercase':
    case 'lowercase':
    case 'trim':
      if (processor.from === fieldName) {
        return ['string'];
      }
      return null;

    case 'join':
      if (processor.from.some((from) => from === fieldName)) {
        return ['string'];
      }
      return null;

    case 'concat':
      if (processor.from.some((from) => from.type === 'field' && from.value === fieldName)) {
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
      return null;
    default: {
      const _exhaustiveCheck: never = processor;
      return _exhaustiveCheck;
    }
  }
}

/**
 * Track field types AND validate type usage through the DSL pipeline.
 */
export function trackFieldTypesAndValidate(flattenedSteps: StreamlangProcessorDefinition[]): {
  fieldTypes: FieldTypeMap;
  errors: StreamlangValidationError[];
  fieldTypesByProcessor: Map<string, FieldTypeMap>;
} {
  const fieldTypes = new Map<string, FieldType>();
  const potentialFieldTypes = new Map<string, Set<FieldType>>();
  const errors: StreamlangValidationError[] = [];
  const fieldTypesByProcessor = new Map<string, FieldTypeMap>();

  for (let i = 0; i < flattenedSteps.length; i++) {
    const step = flattenedSteps[i];
    if (!step) continue;

    const processorId = step.customIdentifier || `${step.action}_${i}`;
    fieldTypesByProcessor.set(processorId, new Map(fieldTypes));

    // Collect fields used as input
    const fieldsUsed: string[] = [];
    switch (step.action) {
      case 'date':
      case 'convert':
      case 'replace':
      case 'redact':
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
        fieldsUsed.push(...extractFieldsFromMathExpression(step.expression));
        break;
      case 'join':
        fieldsUsed.push(...step.from);
        break;
      case 'concat':
        fieldsUsed.push(
          ...step.from.filter((from) => from.type === 'field').map((from) => from.value)
        );
        break;
      case 'append':
      case 'drop_document':
      case 'manual_ingest_pipeline':
      case 'remove_by_prefix':
        break;
      default: {
        const _exhaustiveCheck: never = step;
        return _exhaustiveCheck;
      }
    }

    // Validate field usage against current types
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
        const fieldOccurrences = new Map<string, Set<string>>();
        const regex = /%\{([^:}]+):([^:}]+)(?::([^}]+))?\}/g;
        let match: RegExpExecArray | null;

        while ((match = regex.exec(pattern)) !== null) {
          const fieldName = match[2]?.trim();
          const typeModifier = match[3]?.trim().toLowerCase();

          if (!fieldName) continue;

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

    // Update types based on processor output
    const modifiedFields = extractModifiedFields(step);
    const isConditional = isConditionalProcessor(step);

    for (const field of modifiedFields) {
      const outputType = getProcessorOutputType(step, field);
      if (outputType !== 'unknown') {
        const currentType = fieldTypes.get(field);

        if (isConditional) {
          const existingPotentialTypes = potentialFieldTypes.get(field) || new Set();

          if (currentType) {
            existingPotentialTypes.add(currentType);
          }
          existingPotentialTypes.add(outputType);

          potentialFieldTypes.set(field, existingPotentialTypes);

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
        } else {
          fieldTypes.set(field, outputType);
          potentialFieldTypes.set(field, new Set([outputType]));
        }
      }
    }

    // Handle rename processor type propagation
    if (step.action === 'rename' && step.from && step.to) {
      const sourceType = fieldTypes.get(step.from);
      if (sourceType) {
        fieldTypes.set(step.to, sourceType);
      }
    }

    // Handle set processor with copy_from type propagation
    if (step.action === 'set' && step.copy_from && step.to) {
      const sourceType = fieldTypes.get(step.copy_from);
      if (sourceType) {
        fieldTypes.set(step.to, sourceType);
      }
    }
  }

  return { fieldTypes, errors, fieldTypesByProcessor };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { StreamlangProcessorDefinition } from '../../types/processors';
import { validateMathExpression } from '../transpilers/shared/math';
import type { StreamlangValidationError } from './types';

/**
 * Validates processor-specific values such as expressions, patterns, and date formats etc.
 *
 * @param step - The processor step to validate
 * @param processorNumber - 1-based index for error messages
 * @param processorId - Unique identifier for the processor
 * @returns Array of validation errors for this processor
 */
export function validateProcessorValues(
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
    case 'redact':
    case 'remove':
    case 'remove_by_prefix':
    case 'drop_document':
    case 'uppercase':
    case 'lowercase':
    case 'trim':
    case 'join':
    case 'concat':
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

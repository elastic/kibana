/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { isActionBlock, isConditionBlock, type StreamlangStep } from '../../types/streamlang';
import type { Condition } from '../../types/conditions';

import type { StreamlangValidationError } from './types';
import {
  hasInvalidFieldNameChars,
  extractAllFieldNames,
  extractFieldNamesFromCondition,
} from './validate_field_names';

/**
 * Validates structural rules:
 * - For wired streams: no manual_ingest_pipeline processors (they are forbidden)
 * - For all streams: remove_by_prefix is not used within where blocks
 * - For all streams: field names don't contain illegal characters
 */
export function validateStepsRecursively(
  steps: StreamlangStep[],
  errors: StreamlangValidationError[],
  processorCounter: { count: number },
  streamType: 'classic' | 'wired',
  isWithinWhereBlock: boolean = false
): void {
  for (const step of steps) {
    if (isConditionBlock(step)) {
      // Validate condition field names
      if (step.condition) {
        const conditionFields = extractFieldNamesFromCondition(step.condition as Condition);
        for (const field of conditionFields) {
          if (hasInvalidFieldNameChars(field)) {
            errors.push({
              type: 'invalid_field_name',
              message: i18n.translate('xpack.streamlang.validation.invalidFieldNameInCondition', {
                defaultMessage:
                  'Invalid field name: "{fieldName}" contains illegal characters (brackets are not allowed)',
                values: { fieldName: field },
              }),
              field,
            });
          }
        }
      }
      // Nested steps are within a where block
      validateStepsRecursively(step.condition.steps, errors, processorCounter, streamType, true);
    } else if (isActionBlock(step)) {
      processorCounter.count++;
      const processorNumber = processorCounter.count;
      const processorId = step.customIdentifier || `${step.action}_${processorNumber}`;

      // Check for forbidden manual_ingest_pipeline (only forbidden in wired streams)
      if (step.action === 'manual_ingest_pipeline' && streamType === 'wired') {
        errors.push({
          type: 'forbidden_processor',
          message: i18n.translate('xpack.streamlang.validation.manualIngestPipelineForbidden', {
            defaultMessage:
              'Manual ingest pipelines are not allowed in wired streams. Use built-in processors instead.',
          }),
          processorId,
          field: 'action',
        });
      }

      // Check for remove_by_prefix used within where block
      if (step.action === 'remove_by_prefix' && isWithinWhereBlock) {
        errors.push({
          type: 'invalid_processor_placement',
          message: i18n.translate('xpack.streamlang.validation.removeByPrefixInWhereBlock', {
            defaultMessage:
              'The remove_by_prefix processor cannot be used within a where block. Use it at the root level or use the remove processor with a condition instead.',
          }),
          processorId,
          field: 'action',
        });
      }

      // Validate field names for illegal characters
      const allFields = extractAllFieldNames(step);
      for (const field of allFields) {
        if (hasInvalidFieldNameChars(field)) {
          errors.push({
            type: 'invalid_field_name',
            message: i18n.translate('xpack.streamlang.validation.invalidFieldNameMessage', {
              defaultMessage:
                'Processor #{processorNumber} ({processorAction}): field "{fieldName}" contains illegal characters (brackets are not allowed)',
              values: {
                processorNumber,
                processorAction: step.action,
                fieldName: field,
              },
            }),
            processorId,
            field,
          });
        }
      }

      // Validate condition field names for 'where' clauses
      if ('where' in step && step.where) {
        const conditionFields = extractFieldNamesFromCondition(step.where);
        for (const field of conditionFields) {
          if (hasInvalidFieldNameChars(field)) {
            errors.push({
              type: 'invalid_field_name',
              message: i18n.translate('xpack.streamlang.validation.invalidFieldNameInWhere', {
                defaultMessage:
                  'Processor #{processorNumber} ({processorAction}): field "{fieldName}" in where clause contains illegal characters (brackets are not allowed)',
                values: {
                  processorNumber,
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
}

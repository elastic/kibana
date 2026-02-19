/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamlangProcessorDefinition } from '../../types/processors';
import type { Condition } from '../../types/conditions';
import {
  isAndCondition,
  isFilterCondition,
  isNotCondition,
  isOrCondition,
} from '../../types/conditions';
import { extractFieldsFromMathExpression } from '../transpilers/shared/math';

/**
 * Regex to check for invalid characters in field names
 * Brackets are not allowed in field names as they cause issues with Elasticsearch
 */
const INVALID_FIELD_NAME_CHARS_REGEX = /[\[\]]/;

/**
 * Check if a field name contains invalid characters (brackets)
 */
export function hasInvalidFieldNameChars(fieldName: string): boolean {
  return INVALID_FIELD_NAME_CHARS_REGEX.test(fieldName);
}

/**
 * Extract all field names from a processor that should be validated for invalid characters
 */
export function extractAllFieldNames(processor: StreamlangProcessorDefinition): string[] {
  const fields: string[] = [];

  switch (processor.action) {
    case 'append':
      fields.push(processor.to);
      break;
    case 'convert':
      fields.push(processor.from);
      if (processor.to) fields.push(processor.to);
      break;
    case 'date':
      fields.push(processor.from);
      if (processor.to) fields.push(processor.to);
      break;
    case 'dissect':
      fields.push(processor.from);
      break;
    case 'grok':
      fields.push(processor.from);
      break;
    case 'rename':
      fields.push(processor.from, processor.to);
      break;
    case 'set':
      fields.push(processor.to);
      if (processor.copy_from) fields.push(processor.copy_from);
      break;
    case 'remove_by_prefix':
    case 'remove':
      fields.push(processor.from);
      break;
    case 'replace':
      fields.push(processor.from);
      if (processor.to) fields.push(processor.to);
      break;
    case 'redact':
      fields.push(processor.from);
      break;
    case 'math':
      fields.push(processor.to);
      fields.push(...extractFieldsFromMathExpression(processor.expression));
      break;
    case 'uppercase':
    case 'lowercase':
    case 'trim':
      fields.push(processor.from);
      if (processor.to) fields.push(processor.to);
      break;
    case 'join':
      fields.push(processor.to);
      fields.push(...processor.from);
      break;
    case 'concat':
      fields.push(processor.to);
      processor.from.forEach((from) => {
        if (from.type === 'field') fields.push(from.value);
      });
      break;
    case 'drop_document':
    case 'manual_ingest_pipeline':
      // No field names to validate
      break;
  }

  return fields;
}

/**
 * Extract field names from a condition for validation
 */
export function extractFieldNamesFromCondition(condition: Condition): string[] {
  const fields: string[] = [];

  if (isAndCondition(condition)) {
    condition.and.forEach((c) => fields.push(...extractFieldNamesFromCondition(c)));
  } else if (isOrCondition(condition)) {
    condition.or.forEach((c) => fields.push(...extractFieldNamesFromCondition(c)));
  } else if (isNotCondition(condition)) {
    fields.push(...extractFieldNamesFromCondition(condition.not));
  } else if (isFilterCondition(condition)) {
    fields.push(condition.field);
  }

  return fields;
}

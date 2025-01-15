/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ExistingFieldsReader } from '@kbn/unified-field-list/src/hooks/use_existing_fields';
import { IndexPattern } from '../../types';

/**
 * Checks if the provided field contains data (works for meta field)
 */
export function fieldContainsData(
  fieldName: string,
  indexPattern: IndexPattern,
  hasFieldData: ExistingFieldsReader['hasFieldData']
) {
  const field = indexPattern.getFieldByName(fieldName);
  return field?.type === 'document' || hasFieldData(indexPattern.id, fieldName);
}

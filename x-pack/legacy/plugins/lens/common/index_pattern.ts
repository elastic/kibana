/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexPattern, MissingFields } from './types';

/**
 * Update the specified index pattern's fields to indicate whether or not they exist.
 */
export function markExistingFields(indexPattern: IndexPattern, missingFields: MissingFields) {
  const missingFieldSet = new Set(missingFields.type === 'some' ? missingFields.fieldNames : '');
  const exists = (fieldName: string) =>
    missingFields.type === 'some' && !missingFieldSet.has(fieldName);

  return {
    ...indexPattern,
    fields: indexPattern.fields.map(f => ({ ...f, exists: exists(f.name) })),
  };
}

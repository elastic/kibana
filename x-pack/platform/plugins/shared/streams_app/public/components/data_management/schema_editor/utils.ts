/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldDefinitionConfig } from '@kbn/streams-schema';
import { isEqual } from 'lodash';
import type { MappedSchemaField, SchemaEditorField } from './types';

export const convertToFieldDefinitionConfig = (
  field: MappedSchemaField
): FieldDefinitionConfig => ({
  type: field.type,
  ...(field.format && field.type === 'date' ? { format: field.format as string } : {}),
  ...(field.additionalParameters && Object.keys(field.additionalParameters).length > 0
    ? field.additionalParameters
    : {}),
});

export function isFieldUncommitted(field: SchemaEditorField, storedFields: SchemaEditorField[]) {
  const fieldDefaults = {
    format: undefined,
    additionalParameters: {},
  };
  // Check if field is new (not in stored fields)
  const storedField = storedFields.find((stored) => stored.name === field.name);
  if (!storedField) {
    // If the field is not stored yet and is still unmapped, then we didn't touch
    // it and it is not uncommitted, since it won't be saved to the stream definition.
    return field.status !== 'unmapped';
  }

  // Create copies without SchemaEditorField-specific properties (result, uncommitted)
  // to compare only the base SchemaField properties
  const { result: _fieldResult, uncommitted: _fieldUncommitted, ...fieldToCompare } = field;
  const {
    result: _storedResult,
    uncommitted: _storedUncommitted,
    ...storedToCompare
  } = storedField;

  // Check if field has been modified (different from stored)
  return !isEqual(
    { ...fieldDefaults, ...storedToCompare },
    { ...fieldDefaults, ...fieldToCompare }
  );
}

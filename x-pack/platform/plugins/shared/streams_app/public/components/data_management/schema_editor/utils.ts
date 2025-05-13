/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldDefinitionConfig } from '@kbn/streams-schema';
import { MappedSchemaField } from './types';

export const convertToFieldDefinitionConfig = (
  field: MappedSchemaField
): FieldDefinitionConfig => ({
  type: field.type,
  ...(field.format && field.type === 'date' ? { format: field.format as string } : {}),
  ...(field.additionalParameters && Object.keys(field.additionalParameters).length > 0
    ? field.additionalParameters
    : {}),
});

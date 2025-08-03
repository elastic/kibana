/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { createOptionsSchemas, createResultSchema } from '@kbn/content-management-utils';

import { lensItemAttributesSchemaV0 as lensItemAttributesSchemaV0 } from '../../v0/schema';
import { lensItemAttributesSchema, lensSavedObjectSchema } from './common';
import { pickFromObjectSchema } from './utils';

export const lensCMCreateOptionsSchema = schema.object(
  {
    ...pickFromObjectSchema(createOptionsSchemas, ['overwrite', 'references']),
  },
  { unknowns: 'forbid' }
);

export const lensCMCreateBodySchema = schema.object(
  {
    options: lensCMCreateOptionsSchema,
    // Permit passing old SO attributes on create
    data: schema.oneOf([lensItemAttributesSchema, lensItemAttributesSchemaV0]),
  },
  {
    unknowns: 'forbid',
  }
);

export const lensCMCreateResultSchema = createResultSchema(lensSavedObjectSchema);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { createOptionsSchemas, createResultSchema } from '@kbn/content-management-utils';

import { lensItemAttributesSchemaV0 } from '../../v0';
import { lensItemAttributesSchema, lensSavedObjectSchema } from './common';
import { pickFromObjectSchema } from '../../../utils';

export const lensCMCreateOptionsSchema = schema.object(
  {
    ...pickFromObjectSchema(createOptionsSchemas, ['id', 'overwrite', 'references']),
  },
  { unknowns: 'forbid' }
);

export const lensCMCreateBodySchema = schema.object(
  {
    options: lensCMCreateOptionsSchema,
    data: schema.oneOf([
      lensItemAttributesSchema,
      lensItemAttributesSchemaV0, // Temporarily permit passing old v0 SO attributes on create
    ]),
  },
  {
    unknowns: 'forbid',
  }
);

export const lensCMCreateResultSchema = createResultSchema(lensSavedObjectSchema);

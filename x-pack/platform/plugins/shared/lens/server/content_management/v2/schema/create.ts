/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { createOptionsSchemas, createResultSchema } from '@kbn/content-management-utils';

import { lensItemAttributesSchemaV0 } from '../../v0';
import { lensItemAttributesSchemaV1 } from '../../v1';
import { lensItemAttributesSchemaV2, lensSavedObjectSchemaV2 } from './common';
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
      lensItemAttributesSchemaV0, // Temporarily permit passing old v0 SO attributes on create
      lensItemAttributesSchemaV1, // Temporarily permit passing old v1 SO attributes on create
      lensItemAttributesSchemaV2,
    ]),
  },
  {
    unknowns: 'forbid',
  }
);

export const lensCMCreateResultSchema = createResultSchema(lensSavedObjectSchemaV2);

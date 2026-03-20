/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';

import { schema } from '@kbn/config-schema';
import { createResultSchema, updateOptionsSchema } from '@kbn/content-management-utils';

import { lensItemAttributesSchemaV1, lensSavedObjectSchemaV1 } from './common';
import { pickFromObjectSchema } from '../../../utils';

export const lensCMUpdateOptionsSchema = schema.object(
  {
    ...pickFromObjectSchema(
      omit(updateOptionsSchema, 'upsert'), // `upsert` is not a schema type
      ['references']
    ),
  },
  { unknowns: 'forbid' }
);

export const lensCMUpdateBodySchema = schema.object(
  {
    options: lensCMUpdateOptionsSchema,
    data: lensItemAttributesSchemaV1,
  },
  {
    unknowns: 'forbid',
  }
);

export const lensCMUpdateResultSchema = createResultSchema(lensSavedObjectSchemaV1);

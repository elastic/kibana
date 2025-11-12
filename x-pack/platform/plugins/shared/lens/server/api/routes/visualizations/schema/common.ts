/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { lensItemDataSchema, lensSavedObjectSchema } from '../../../../content_management';
import { pickFromObjectSchema } from '../../../../utils';

/**
 * The Lens item meta returned from the server
 */
export const lensItemMetaSchema = schema.object(
  {
    ...pickFromObjectSchema(lensSavedObjectSchema.getPropSchemas(), [
      'type',
      'createdAt',
      'updatedAt',
      'createdBy',
      'updatedBy',
      'originId',
      'managed',
    ]),
  },
  { unknowns: 'forbid' }
);

/**
 * The Lens response item returned from the server
 */
export const lensResponseItemSchema = schema.object(
  {
    id: lensSavedObjectSchema.getPropSchemas().id,
    data: lensItemDataSchema,
    meta: lensItemMetaSchema,
  },
  { unknowns: 'forbid' }
);

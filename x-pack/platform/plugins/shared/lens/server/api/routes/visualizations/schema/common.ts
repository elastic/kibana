/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { lensApiStateSchema } from '@kbn/lens-embeddable-utils/config_builder';
import { lensItemDataSchema, lensSavedObjectSchema } from '../../../../content_management';
import { pickFromObjectSchema } from '../../../../utils';
import { lensItemDataSchemaV0 } from '../../../../content_management/v0';

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
    data: schema.oneOf([lensApiStateSchema, lensItemDataSchema, lensItemDataSchemaV0]),
    meta: lensItemMetaSchema,
  },
  { unknowns: 'forbid' }
);

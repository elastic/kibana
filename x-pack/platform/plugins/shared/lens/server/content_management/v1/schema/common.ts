/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { savedObjectSchema } from '@kbn/content-management-utils';

import { pickFromObjectSchema } from '../../../utils';
import { LENS_ITEM_VERSION } from '../constants';

export const lensItemAttributesSchema = schema.object(
  {
    title: schema.string(),
    description: schema.maybe(schema.string()),
    visualizationType: schema.string(),
    state: schema.maybe(schema.any()),
    // TODO make version required
    version: schema.maybe(schema.literal(LENS_ITEM_VERSION)), // pin version explicitly
  },
  { unknowns: 'forbid' }
);

export const lensAPIStateSchema = schema.object(
  {
    isNewApiFormat: schema.literal(true), // pin this to validate CB transformations
  },
  { unknowns: 'allow' }
);

export const lensAPIAttributesSchema = schema.object(
  {
    ...lensItemAttributesSchema.getPropSchemas(),
    state: lensAPIStateSchema,
  },
  { unknowns: 'forbid' }
);

/**
 * The underlying SO type used to store Lens state in Content Management.
 *
 * Only used in lens server-side Content Management.
 */
export const lensSavedObjectSchema = savedObjectSchema(lensItemAttributesSchema);

/**
 * The common SO type used for mSearch items.
 */
export const lensCommonSavedObjectSchema = savedObjectSchema(
  schema.object(
    {
      ...pickFromObjectSchema(lensItemAttributesSchema.getPropSchemas(), ['title', 'description']),
    },
    { unknowns: 'forbid' }
  )
);

/**
 * The Lens item data returned from the server
 */
export const lensItemSchema = schema.object(
  {
    ...pickFromObjectSchema(lensSavedObjectSchema.getPropSchemas(), ['id', 'references']),
    // Spread attributes at root
    ...lensSavedObjectSchema.getPropSchemas().attributes.getPropSchemas(),
  },
  { unknowns: 'forbid' }
);

/**
 * The Lens item data returned from the server
 */
export const lensAPIConfigSchema = schema.object(
  {
    // TODO flatten this with new CB shape
    ...pickFromObjectSchema(lensSavedObjectSchema.getPropSchemas(), ['id', 'references']),
    // Spread attributes at root
    ...lensAPIAttributesSchema.getPropSchemas(),
  },
  { unknowns: 'forbid' }
);

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
      'originId', // maybe??
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
    data: lensAPIConfigSchema,
    meta: lensItemMetaSchema,
  },
  { unknowns: 'forbid' }
);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { savedObjectSchema } from '@kbn/content-management-utils';
import { pickFromObjectSchema } from '../../../utils';

/**
 * Pre-existing Lens SO attributes (aka `v0`).
 *
 * We could still require handling see these attributes and should allow
 * saving them as is with unknown version. The CM will eventually apply the transforms.
 *
 * @deprecated - use `v1` schemas
 */
export const lensItemAttributesSchemaV0 = schema.object(
  {
    title: schema.string(),
    description: schema.maybe(schema.nullable(schema.string())),
    visualizationType: schema.maybe(schema.nullable(schema.string())),
    state: schema.maybe(schema.any()),
    uiStateJSON: schema.maybe(schema.string()),
    visState: schema.maybe(schema.string()),
    savedSearchRefName: schema.maybe(schema.string()),
  },
  { unknowns: 'ignore' }
);

/**
 * The underlying SO type used to store Lens state in Content Management.
 *
 * Only used in lens server-side Content Management.
 *
 * @deprecated - use `v1` schemas
 */
export const lensSavedObjectSchemaV0 = savedObjectSchema(lensItemAttributesSchemaV0);

/**
 * The Lens item data returned from the server
 *
 * @deprecated - use `v1` schemas
 */
export const lensItemSchemaV0 = schema.object(
  {
    ...pickFromObjectSchema(lensSavedObjectSchemaV0.getPropSchemas(), ['id', 'references']),
    // Spread attributes at root
    ...lensSavedObjectSchemaV0.getPropSchemas().attributes.getPropSchemas(),
  },
  { unknowns: 'forbid' }
);

export const lensItemDataSchemaV0 = lensItemSchemaV0.extends({
  id: undefined,
});

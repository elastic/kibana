/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { referencesSchema } from '@kbn/content-management-utils';

/**
 * Pre-existing Lens SO attributes (aka `v0`).
 *
 * We could still require handling see these attributes and should allow
 * saving them as is with unknown version. The CM will eventually apply the transforms.
 */
export const lensItemAttributesSchemaV0 = schema.object(
  {
    title: schema.string(),
    description: schema.maybe(schema.nullable(schema.string())),
    visualizationType: schema.maybe(schema.string()),
    state: schema.maybe(schema.any()),
    uiStateJSON: schema.maybe(schema.string()),
    visState: schema.maybe(schema.string()),
    savedSearchRefName: schema.maybe(schema.string()),
  },
  { unknowns: 'ignore' }
);

/**
 * Pre-existing Lens SO create body data (aka `v0`).
 *
 * We may require the ability to create a Lens SO with and old state.
 */
export const lensCreateRequestBodyDataSchemaV0 = lensItemAttributesSchemaV0.extends({
  references: referencesSchema,
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import { schema } from '@kbn/config-schema';

export const fieldDefinitionSchema = schema.object({
  fieldDefinitionId: schema.string(),
  name: schema.string(),
  definition: schema.string(),
  owner: schema.string(),
  description: schema.maybe(schema.string()),
  isGlobal: schema.maybe(schema.boolean()),
});

export const modelVersion1: SavedObjectsModelVersion = {
  changes: [],
  schemas: {
    create: fieldDefinitionSchema,
    forwardCompatibility: fieldDefinitionSchema.extends({}, { unknowns: 'ignore' }),
  },
};

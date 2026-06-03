/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import { schema } from '@kbn/config-schema';

export const templateSchema = schema.object({
  templateId: schema.string(),
  name: schema.string(),
  owner: schema.string(),
  definition: schema.string(),
  templateVersion: schema.number(),
  deletedAt: schema.nullable(schema.string()),
  description: schema.maybe(schema.string()),
  tags: schema.maybe(schema.arrayOf(schema.string())),
  author: schema.maybe(schema.string()),
  usageCount: schema.maybe(schema.number()),
  fieldCount: schema.maybe(schema.number()),
  fieldNames: schema.maybe(
    schema.arrayOf(
      schema.object({
        name: schema.string(),
        label: schema.string(),
        type: schema.string(),
        control: schema.string(),
      })
    )
  ),
  lastUsedAt: schema.maybe(schema.string()),
  isDefault: schema.maybe(schema.boolean()),
  isLatest: schema.maybe(schema.boolean()),
  isEnabled: schema.maybe(schema.boolean()),
});

export const modelVersion1: SavedObjectsModelVersion = {
  changes: [],
  schemas: {
    create: templateSchema,
    forwardCompatibility: templateSchema.extends({}, { unknowns: 'ignore' }),
  },
};

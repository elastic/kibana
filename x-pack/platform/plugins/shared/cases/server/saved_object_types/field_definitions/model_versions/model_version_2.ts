/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import { schema } from '@kbn/config-schema';
import { fieldDefinitionSchema } from './model_version_1';

export const fieldDefinitionSchemaV2 = fieldDefinitionSchema.extends({
  displayOrder: schema.maybe(schema.number({ min: 0 })),
});

export const modelVersion2: SavedObjectsModelVersion = {
  // `displayOrder` is intentionally left unmapped: it is only read from `_source` and
  // sorted in application code. A `mappings_addition` can be introduced later if ES-side
  // querying or sorting is ever needed.
  changes: [],
  schemas: {
    create: fieldDefinitionSchemaV2,
    forwardCompatibility: fieldDefinitionSchemaV2.extends({}, { unknowns: 'ignore' }),
  },
};

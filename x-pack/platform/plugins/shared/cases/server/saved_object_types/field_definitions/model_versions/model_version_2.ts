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
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        displayOrder: { type: 'integer' },
      },
    },
  ],
  schemas: {
    create: fieldDefinitionSchemaV2,
    forwardCompatibility: fieldDefinitionSchemaV2.extends({}, { unknowns: 'ignore' }),
  },
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import { schema } from '@kbn/config-schema';
import { MAX_TEMPLATE_KEY_LENGTH } from '../../../../common/constants';
import { templateSchemaV2 } from './model_version_2';

// Adds the optional `legacyKey` — the originating v1 template `key`, written only by the
// v1 -> v2 templates migration to preserve template lineage (v1 keyed identity on `key`, not name).
export const templateSchemaV3 = templateSchemaV2.extends({
  legacyKey: schema.maybe(schema.string({ maxLength: MAX_TEMPLATE_KEY_LENGTH })),
});

export const modelVersion3: SavedObjectsModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        legacyKey: {
          type: 'keyword',
          ignore_above: 1024,
        },
      },
    },
  ],
  schemas: {
    create: templateSchemaV3,
    forwardCompatibility: templateSchemaV3.extends({}, { unknowns: 'ignore' }),
  },
};

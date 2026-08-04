/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import { schema } from '@kbn/config-schema';
import { MAX_CUSTOM_FIELD_KEY_LENGTH } from '../../../../common/constants';
import { fieldDefinitionSchema } from './model_version_1';

/**
 * v2 adds the optional server-managed `legacyKey` linking a migrated/mirrored
 * definition to its v1 custom-field configuration key. It is intentionally
 * **unmapped** (no production path searches, filters, sorts, or aggregates on
 * it — link resolution loads the bounded owner/space definition set and
 * resolves in memory), so this model version has no mappings change.
 */
export const fieldDefinitionSchemaV2 = fieldDefinitionSchema.extends({
  // Bounded like the v1 custom-field key contract (a uuidv4-length key).
  legacyKey: schema.maybe(schema.string({ maxLength: MAX_CUSTOM_FIELD_KEY_LENGTH })),
});

export const modelVersion2: SavedObjectsModelVersion = {
  changes: [],
  schemas: {
    create: fieldDefinitionSchemaV2,
    forwardCompatibility: fieldDefinitionSchemaV2.extends({}, { unknowns: 'ignore' }),
  },
};

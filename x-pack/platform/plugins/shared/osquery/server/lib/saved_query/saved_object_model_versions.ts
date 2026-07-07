/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import { savedQuerySchemaV2, packSchemaV2, packSchemaV3 } from './schemas';

export const savedQueryModelVersion1: SavedObjectsModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        timeout: { type: 'short' },
      },
    },
  ],
};

export const savedQueryModelVersion2: SavedObjectsModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        created_by_profile_uid: { type: 'keyword' },
        updated_by_profile_uid: { type: 'keyword' },
      },
    },
  ],
  schemas: {
    forwardCompatibility: savedQuerySchemaV2.extends({}, { unknowns: 'ignore' }),
  },
};

export const packSavedObjectModelVersion1: SavedObjectsModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        queries: {
          properties: {
            timeout: { type: 'short' },
          },
        },
      },
    },
  ],
};

export const packSavedObjectModelVersion2: SavedObjectsModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        created_by_profile_uid: { type: 'keyword' },
        updated_by_profile_uid: { type: 'keyword' },
      },
    },
  ],
  schemas: {
    forwardCompatibility: packSchemaV2.extends({}, { unknowns: 'ignore' }),
  },
};

/**
 * V3 adds pack-level scheduling fields:
 * - `schedule_type` (keyword): 'interval' | 'rrule'
 * - `interval` (integer): pack-level interval in seconds (new — previously per-query only)
 * - `rrule_schedule` (dynamic: false): the serialized RRULE config object
 *
 * CRITICAL: the pack SO root mappings are NOT `dynamic: false` (unlike the
 * saved query SO). Without this `mappings_addition`, new pack-level fields are
 * silently dropped on write. Per-query overrides inside `queries` (which is
 * `dynamic: false`) do not need explicit mapping; `packQuerySchema` uses
 * `unknowns: 'allow'` so they round-trip cleanly.
 */
export const packSavedObjectModelVersion3: SavedObjectsModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        schedule_type: { type: 'keyword', ignore_above: 1024 },
        interval: { type: 'integer' },
        rrule_schedule: { dynamic: false, properties: {} },
      },
    },
  ],
  schemas: {
    forwardCompatibility: packSchemaV3.extends({}, { unknowns: 'ignore' }),
    // `create` is required for new model versions per #240919 (rollback support
    // soft-enforced 2025-11-05). The pack SO root is NOT `dynamic: false`,
    // so the SO-types lint requires every mapping field be declared here.
    // Reuse `packSchemaV3` (which already declares V1+V2+V3 fields) and accept
    // unknown sub-keys so per-query RRULE overrides / unknown rrule parts
    // round-trip. See `design.md` D35.
    create: packSchemaV3.extends({}, { unknowns: 'allow' }),
  },
};

export const packAssetSavedObjectModelVersion1: SavedObjectsModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        queries: {
          properties: {
            timeout: { type: 'short' },
          },
        },
      },
    },
  ],
};

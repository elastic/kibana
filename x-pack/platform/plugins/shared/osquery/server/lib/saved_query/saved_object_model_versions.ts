/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectModelDataBackfillFn,
  SavedObjectsModelVersion,
} from '@kbn/core-saved-objects-server';
import { v5 as uuidv5 } from 'uuid';
import { savedQuerySchemaV2, packSchemaV2, packSchemaV3, packSchemaV4 } from './schemas';
import { deriveEffectiveQueryKey } from '../../routes/pack/utils';

// Domain prefix for the UUIDv5 name. Must never change once V4 has shipped.
const SCHEDULE_ID_NAME_PREFIX = 'osquery-schedule:';

// Deterministic `start_date` fallback (never `new Date()`) for a pack SO
// missing `created_at`.
const START_DATE_EPOCH_FALLBACK = '1970-01-01T00:00:00.000Z';

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
 * V3 adds pack-level schedule_type/interval/rrule_schedule. CRITICAL: pack SO
 * root is NOT dynamic:false, so these need an explicit mapping or writes
 * silently drop the fields.
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
    // 'create' schema is required for new model versions (enables rollback support).
    create: packSchemaV3.extends({}, { unknowns: 'allow' }),
  },
};

/**
 * V4 backfills `schedule_id`/`start_date`/`id` onto pack queries lacking them.
 *
 * Must be DETERMINISTIC: data_backfill also runs on the read path (get/find of
 * an un-reindexed doc, no write-back), so `uuidv4()`/`new Date()` would mint
 * different values on every read and across nodes, severing the schedule_id
 * history join. Both fields derive from stable per-doc inputs (UUIDv5 of
 * soId+queryKey; `created_at`). Existing values are preserved as-is.
 */
const backfillScheduleIdFn: SavedObjectModelDataBackfillFn<
  { queries?: Array<{ id?: string; schedule_id?: string; start_date?: string }> },
  { queries?: Array<{ id?: string; schedule_id?: string; start_date?: string }> }
> = ({ id: soId, attributes, created_at: createdAt }) => {
  const queries = attributes.queries;
  // No-ops on empty/missing queries array.
  if (!queries?.length) {
    return { attributes: {} };
  }

  const defaultStartDate = createdAt ?? START_DATE_EPOCH_FALLBACK;

  return {
    attributes: {
      queries: queries.map((query, index) => {
        const effectiveKey = deriveEffectiveQueryKey(query, index);

        return {
          ...query,
          id: effectiveKey,
          schedule_id:
            query.schedule_id ??
            uuidv5(`${SCHEDULE_ID_NAME_PREFIX}${soId}:${effectiveKey}`, uuidv5.URL),
          start_date: query.start_date ?? defaultStartDate,
        };
      }),
    },
  };
};

export const packSavedObjectModelVersion4: SavedObjectsModelVersion = {
  changes: [
    {
      type: 'data_backfill',
      backfillFn: backfillScheduleIdFn,
    },
  ],
  schemas: {
    forwardCompatibility: packSchemaV4.extends({}, { unknowns: 'ignore' }),
    create: packSchemaV4.extends({}, { unknowns: 'allow' }),
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

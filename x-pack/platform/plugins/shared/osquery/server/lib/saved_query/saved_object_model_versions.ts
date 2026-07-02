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
import { v4 as uuidv4 } from 'uuid';
import { savedQuerySchemaV2, packSchemaV2, packSchemaV3, packSchemaV4 } from './schemas';
import { deriveEffectiveQueryKey } from '../../routes/pack/utils';

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
    // round-trip.
    create: packSchemaV3.extends({}, { unknowns: 'allow' }),
  },
};

/**
 * V4 deterministically backfills a stable per-query `schedule_id`, `start_date`,
 * and `id` onto every pack-query that lacks them. Unlike the best-effort Task
 * Manager backfill it replaces, a `data_backfill` model version runs exactly
 * once per Saved Object on EVERY upgrade / rollback / Serverless path, which is
 * the only mechanism that gives upgrade-path determinism.
 *
 * - `schedule_id` (`uuidv4()`): the modern scheduled-history join key.
 * - `start_date` (migration-run timestamp): mirrors the shipped 9.4.x task
 *   backfill byte-for-byte so osquerybeat computes real
 *   `schedule_execution_count` values instead of `0` for skipped-9.4.x
 *   upgrades. `data_backfill` has no clock injection, so a single timestamp is
 *   captured per migration run (same as the old task's `moment().toISOString()`
 *   per pass).
 * - `id` (`deriveEffectiveQueryKey`): stamps the stable key the read/wire path
 *   already derives for no-id rows so `keyBy(queries, 'id')` in the update
 *   route no longer collapses legacy / asset-installed / imported rows under a
 *   single `undefined` key — which would otherwise re-generate every minted
 *   `schedule_id` on the first edit-save.
 *
 * Existing values are preserved byte-for-byte; only the missing fields are
 * minted, keeping the backfill idempotent.
 */
const backfillScheduleIdFn: SavedObjectModelDataBackfillFn<
  { queries?: Array<{ id?: string; schedule_id?: string; start_date?: string }> },
  { queries?: Array<{ id?: string; schedule_id?: string; start_date?: string }> }
> = ({ attributes }) => {
  const queries = attributes.queries;
  // On-disk pack queries are stored as an array (see `PackSavedObject.queries`
  // and `convertPackQueriesToSO`, which always writes an array). This guard
  // no-ops on a missing/empty array — and, as a pre-existing scope note, on the
  // record-shaped variant the pack schema also permits (`.length` is undefined
  // for an object). No record-shaped pack docs are known in the wild; if any
  // surface, this backfill would skip them and a follow-up array-or-record
  // normalization would be needed.
  if (!queries?.length) {
    // `data_backfill` requires an `attributes` object; an empty patch is the no-op.
    return { attributes: {} };
  }

  // One timestamp per migration run, matching the old task backfill's
  // per-pass `moment().toISOString()`.
  const migrationRunDate = new Date().toISOString();

  return {
    attributes: {
      queries: queries.map((query, index) => ({
        ...query,
        id: deriveEffectiveQueryKey(query, index),
        schedule_id: query.schedule_id ?? uuidv4(),
        start_date: query.start_date ?? migrationRunDate,
      })),
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

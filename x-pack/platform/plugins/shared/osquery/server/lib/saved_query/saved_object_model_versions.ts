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
 * V4 deterministically backfills `schedule_id`, `start_date`, and `id` onto
 * every pack query lacking them — runs once per SO on every upgrade/rollback,
 * unlike the best-effort task it replaces.
 */
const backfillScheduleIdFn: SavedObjectModelDataBackfillFn<
  { queries?: Array<{ id?: string; schedule_id?: string; start_date?: string }> },
  { queries?: Array<{ id?: string; schedule_id?: string; start_date?: string }> }
> = ({ attributes }) => {
  const queries = attributes.queries;
  // No-ops on empty/missing queries array.
  if (!queries?.length) {
    return { attributes: {} };
  }

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

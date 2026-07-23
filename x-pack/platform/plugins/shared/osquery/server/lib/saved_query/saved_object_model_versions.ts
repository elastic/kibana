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
import {
  deriveEffectiveQueryKey,
  hasQueries,
  START_DATE_EPOCH_FALLBACK,
} from '../../routes/pack/utils';

interface BackfillableQuery {
  id?: string;
  schedule_id?: string;
  start_date?: string;
  [key: string]: unknown;
}

// packSchemaV1 allows queries as either shape, so the backfill must mint onto both.
type BackfillableQueries = BackfillableQuery[] | Record<string, BackfillableQuery>;

// Must never change once V4 has shipped (feeds the deterministic UUIDv5).
const SCHEDULE_ID_NAME_PREFIX = 'osquery-schedule:';

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
    // Required for rollback support.
    create: packSchemaV3.extends({}, { unknowns: 'allow' }),
  },
};

/**
 * V4 backfills `schedule_id`/`start_date`/`id` onto pack queries lacking them.
 * MUST be deterministic: data_backfill also runs on the read path (no write-back),
 * so `uuidv4()`/`new Date()` would drift across reads/nodes and sever the
 * schedule_id history join. Existing values are preserved as-is.
 */
const backfillScheduleIdFn: SavedObjectModelDataBackfillFn<
  { queries?: BackfillableQueries; created_at?: string },
  { queries?: BackfillableQueries }
> = ({ id: soId, attributes, created_at: envelopeCreatedAt }) => {
  const queries = attributes.queries;
  if (!hasQueries(queries)) {
    return { attributes: {} };
  }

  // Anchor to the pack's OWN `attributes.created_at`, not the envelope
  // created_at — on the migrate path the envelope reflects migration time, not
  // original creation, which would mint a non-deterministic start_date.
  const defaultStartDate = attributes.created_at ?? envelopeCreatedAt ?? START_DATE_EPOCH_FALLBACK;

  const usedKeys = new Set<string>();

  const backfillOne = (
    query: BackfillableQuery,
    indexOrKey: string | number
  ): BackfillableQuery => {
    // `query.id` when present, else the array index / map key. Index-derived
    // keys are only stable if the collection isn't reordered before reindex;
    // API-origin packs always carry a stable id, so that's import-only.
    let effectiveKey = deriveEffectiveQueryKey(query, indexOrKey);

    // Disambiguate a derived-key collision (degenerate import docs only) so two
    // rows can't share one id/schedule_id.
    if (usedKeys.has(effectiveKey)) {
      effectiveKey = `${effectiveKey}#${String(indexOrKey)}`;
    }

    usedKeys.add(effectiveKey);

    // Empty-string schedule_id is malformed → treat as absent and mint.
    const existingScheduleId = query.schedule_id ? query.schedule_id : undefined;

    return {
      ...query,
      id: effectiveKey,
      schedule_id:
        existingScheduleId ??
        uuidv5(`${SCHEDULE_ID_NAME_PREFIX}${soId}:${effectiveKey}`, uuidv5.URL),
      start_date: query.start_date ?? defaultStartDate,
    };
  };

  // Return the patch in the SAME shape it was received.
  if (Array.isArray(queries)) {
    return { attributes: { queries: queries.map((query, index) => backfillOne(query, index)) } };
  }

  const backfilledRecord: Record<string, BackfillableQuery> = {};
  for (const [key, query] of Object.entries(queries)) {
    backfilledRecord[key] = backfillOne(query, key);
  }

  return { attributes: { queries: backfilledRecord } };
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

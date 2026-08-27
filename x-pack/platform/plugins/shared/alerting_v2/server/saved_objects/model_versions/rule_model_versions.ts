/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersionMap } from '@kbn/core-saved-objects-server';
import {
  ruleSavedObjectAttributesSchemaV1,
  ruleSavedObjectAttributesSchemaV2,
  ruleSavedObjectAttributesSchemaV3,
  ruleSavedObjectAttributesSchemaV4,
} from '../schemas/rule_saved_object_attributes';
import { migrateRuleArtifactsToData } from './migrate_rule_artifacts_to_data';

export const ruleModelVersions: SavedObjectsModelVersionMap = {
  '1': {
    changes: [],
    schemas: {
      forwardCompatibility: ruleSavedObjectAttributesSchemaV1.extends({}, { unknowns: 'ignore' }),
      create: ruleSavedObjectAttributesSchemaV1,
    },
  },
  '2': {
    // Index the already-existing `schedule.every` attribute so the
    // maxScheduledPerMinute guardrail can aggregate scheduled frequency.
    changes: [
      {
        type: 'mappings_addition',
        addedMappings: {
          schedule: {
            properties: {
              every: { type: 'keyword', ignore_above: 256 },
            },
          },
        },
      },
    ],
    schemas: {
      forwardCompatibility: ruleSavedObjectAttributesSchemaV1.extends({}, { unknowns: 'ignore' }),
      create: ruleSavedObjectAttributesSchemaV1,
    },
  },
  '3': {
    // Adds the server-managed `metadata.version` attribute. It is not indexed (we never
    // search/sort/aggregate on it), so there is no mappings change. Pre-v3 rules
    // are backfilled to `1` so every rule has a valid baseline counter; the next
    // mutation increments from there.
    changes: [
      {
        type: 'data_backfill',
        backfillFn: (doc) => ({
          attributes: { metadata: { ...doc.attributes.metadata, version: 1 } },
        }),
      },
    ],
    schemas: {
      forwardCompatibility: ruleSavedObjectAttributesSchemaV2.extends({}, { unknowns: 'ignore' }),
      create: ruleSavedObjectAttributesSchemaV2,
    },
  },
  '4': {
    // Introduce the structured `artifacts[].data` record, backfilled from the
    // legacy `artifacts[].value`. `value` is gone from the schema and is never
    // written again, but the backfill leaves the existing one on disk so a
    // rollback to model version 3 — whose schema still requires it — can read
    // migrated rules.
    changes: [
      {
        type: 'data_backfill',
        backfillFn: migrateRuleArtifactsToData,
      },
    ],
    schemas: {
      forwardCompatibility: ruleSavedObjectAttributesSchemaV3.extends({}, { unknowns: 'ignore' }),
      create: ruleSavedObjectAttributesSchemaV3,
    },
  },
  '5': {
    // Add optional `metadata.source` — a framework-agnostic { type, data }
    // envelope tracking the originating spec or content pack. `source.type` is
    // indexed so rules can be filtered by source type; `source.data` is flattened
    // so per-type payload keys can be filtered. No backfill: pre-existing
    // user-authored rules have no source.
    changes: [
      {
        type: 'mappings_addition',
        addedMappings: {
          metadata: {
            properties: {
              source: {
                properties: {
                  type: { type: 'keyword', ignore_above: 256 },
                  data: { type: 'flattened' },
                },
              },
            },
          },
        },
      },
    ],
    schemas: {
      forwardCompatibility: ruleSavedObjectAttributesSchemaV4.extends({}, { unknowns: 'ignore' }),
      create: ruleSavedObjectAttributesSchemaV4,
    },
  },
};

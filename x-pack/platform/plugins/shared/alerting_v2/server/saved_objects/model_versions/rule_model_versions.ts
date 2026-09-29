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
  ruleSavedObjectAttributesSchemaV5,
} from '../schemas/rule_saved_object_attributes';
import { migrateRuleArtifactsToData } from './migrate_rule_artifacts_to_data';
import { migrateDashboardArtifactDataKey } from './migrate_dashboard_artifact_data_key';
import { migrateRuleQueryShape } from './migrate_rule_query_shape';
import { toActor } from './to_actor';

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
    // Renames the dashboard artifact data key `dashboardId` -> `dashboard_id`
    // and the matching `artifact:dashboardId:*` reference names to match the
    // snake_case payload convention of the alerting v2 APIs.
    changes: [
      {
        type: 'unsafe_transform',
        transformFn: (typeSafeGuard) => typeSafeGuard(migrateDashboardArtifactDataKey),
      },
    ],
    schemas: {
      forwardCompatibility: ruleSavedObjectAttributesSchemaV3.extends({}, { unknowns: 'ignore' }),
      create: ruleSavedObjectAttributesSchemaV3,
    },
  },
  '6': {
    /**
     * v6 migrates `createdBy` and `updatedBy` from a bare profile UID string to a
     * structured actor object. Only string values are rewritten: a `null` actor
     * (an unattributed write) stays `null`, which the v6 schema still allows, and
     * an already-structured actor is left alone so the backfill is idempotent.
     *
     * This reshapes existing attributes, so it is NOT rollback-compatible: the
     * v1-v5 schemas type both fields as strings and reject the object, meaning a
     * node rolled back to v5 fails to read any rule with an attributed actor.
     * Accepted while alerting v2 is in technical preview. The SO migration
     * fixtures therefore only carry `null` actors, which round-trip through the
     * rollback check; the string -> object conversion is covered by unit tests.
     */
    changes: [
      {
        type: 'data_backfill',
        backfillFn: (doc) => {
          const { createdBy, updatedBy } = doc.attributes as {
            createdBy?: unknown;
            updatedBy?: unknown;
          };
          const createdByActor = toActor(createdBy);
          const updatedByActor = toActor(updatedBy);

          return {
            attributes: {
              ...(createdByActor ? { createdBy: createdByActor } : {}),
              ...(updatedByActor ? { updatedBy: updatedByActor } : {}),
            },
          };
        },
      },
    ],
    schemas: {
      forwardCompatibility: ruleSavedObjectAttributesSchemaV4.extends({}, { unknowns: 'ignore' }),
      create: ruleSavedObjectAttributesSchemaV4,
    },
  },
  '7': {
    // The GA baseline shape: one `query` (`base` plus an optional `breach`
    // segment) instead of the `composed`/`standalone` union, `recovery` and
    // `no_data` objects instead of the top-level strategy scalars, and a
    // `state_transition` nested per phase.
    //
    // Additive only. Model version 6's schema requires `query.format` and a
    // present `query.breach`, so the pre-collapse keys stay on disk for the
    // rollback window and model version 8 removes them. Rules created after the
    // upgrade carry only the new shape, matching the model version 4 precedent.
    //
    // An `unsafe_transform` rather than a `data_backfill` because `query` has to
    // merge the two shapes key by key; `data_backfill` deep-merges its result,
    // which cannot leave a composed `breach.segment` in place while adding
    // `base` from a standalone `breach.query`.
    changes: [
      {
        type: 'unsafe_transform',
        transformFn: (typeSafeGuard) => typeSafeGuard(migrateRuleQueryShape),
      },
    ],
    schemas: {
      forwardCompatibility: ruleSavedObjectAttributesSchemaV5.extends({}, { unknowns: 'ignore' }),
      create: ruleSavedObjectAttributesSchemaV5,
    },
  },
};

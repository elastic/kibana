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
  ruleSavedObjectAttributesSchemaV6,
  ruleSavedObjectAttributesSchemaV7,
  ruleSavedObjectAttributesSchemaV8,
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
    // rollback window and a later model version removes them. Rules created
    // after the upgrade carry only the new shape, matching the model version 4
    // precedent.
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
  '8': {
    /**
     * v8 moves the server-managed version counter from `metadata.version` to the
     * attributes root, so that `metadata` holds only client-supplied fields.
     * Documents written before the v3 backfill have no counter at all and are
     * seeded with `1`, the same baseline v3 used.
     *
     * Still not indexed, so there is no mappings change.
     *
     * As in v4, the backfill leaves the legacy `metadata.version` on disk — it is
     * never written or read again — so a rollback to model version 7 keeps the
     * counter it was migrated from.
     */
    changes: [
      {
        type: 'data_backfill',
        backfillFn: (doc) => ({
          attributes: { version: doc.attributes.metadata?.version ?? 1 },
        }),
      },
    ],
    schemas: {
      forwardCompatibility: ruleSavedObjectAttributesSchemaV6.extends({}, { unknowns: 'ignore' }),
      create: ruleSavedObjectAttributesSchemaV6,
    },
  },
  '9': {
    /*
     * Adds and indexes `metadata.routing_tags`, which action policies match on.
     * Optional, so existing rules need no backfill.
     *
     * The rules client filters on the field in the same release that adds its
     * mapping, so this is NOT rollback-compatible: a node rolled back to model
     * version 8 does not know the field. Accepted while alerting v2 is
     * experimental.
     */
    changes: [
      {
        type: 'mappings_addition',
        addedMappings: {
          metadata: {
            properties: {
              routing_tags: { type: 'keyword', ignore_above: 128 },
            },
          },
        },
      },
    ],
    schemas: {
      forwardCompatibility: ruleSavedObjectAttributesSchemaV7.extends({}, { unknowns: 'ignore' }),
      create: ruleSavedObjectAttributesSchemaV7,
    },
  },
  '10': {
    // Introduce `metadata.builder_fields`, the structured parameters a rule
    // builder was configured with. Purely additive and optional, so there is
    // nothing to backfill: rules created before this version keep only their
    // `builder_type` and stay readable.
    //
    // Mapped as `flattened` so leaf values are searchable as keywords (term,
    // exists, prefix queries). Typed sub-fields for numeric range queries can
    // be added per builder type in a future model version.
    //
    // Rolling back to model version 9 is safe: that schema ignores unknown
    // attributes on read, so a rule carrying builder fields still loads, with
    // the query it was already storing. The flattened mapping is ignored by
    // older code — unmapped fields in `_source` are harmless.
    changes: [
      {
        type: 'mappings_addition',
        addedMappings: {
          metadata: {
            properties: {
              builder_fields: { type: 'flattened', ignore_above: 4096 },
            },
          },
        },
      },
    ],
    schemas: {
      forwardCompatibility: ruleSavedObjectAttributesSchemaV8.extends({}, { unknowns: 'ignore' }),
      create: ruleSavedObjectAttributesSchemaV8,
    },
  },
};

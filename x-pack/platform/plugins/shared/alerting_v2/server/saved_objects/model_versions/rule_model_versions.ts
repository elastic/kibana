/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersionMap } from '@kbn/core-saved-objects-server';
import {
  securityDetectionQueryManifest,
  securityDetectionThresholdManifest,
} from '@kbn/security-detection-rule-schema';
import {
  ruleSavedObjectAttributesSchemaV1,
  ruleSavedObjectAttributesSchemaV2,
  ruleSavedObjectAttributesSchemaV3,
  ruleSavedObjectAttributesSchemaV4,
  ruleSavedObjectAttributesSchemaV5,
} from '../schemas/rule_saved_object_attributes';
import { migrateRuleArtifactsToData } from './migrate_rule_artifacts_to_data';
import { migrateDashboardArtifactDataKey } from './migrate_dashboard_artifact_data_key';
import { toActor } from './to_actor';
import { fromBuilderManifest } from './from_builder_manifest';

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
    // Introduce `metadata.builder_fields`, the structured parameters a rule
    // builder was configured with. Purely additive and optional, so there is
    // nothing to backfill: rules created before this version keep only their
    // `builder_type` and stay readable.
    //
    // Mapped as `flattened` so leaf values are searchable as keywords (term,
    // exists, prefix queries). Typed sub-fields for numeric range queries can
    // be added per builder type in a future model version.
    //
    // Rolling back to model version 6 is safe: that schema ignores unknown
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
      forwardCompatibility: ruleSavedObjectAttributesSchemaV5.extends({}, { unknowns: 'ignore' }),
      create: ruleSavedObjectAttributesSchemaV5,
    },
  },
  // ---------------------------------------------------------------------------
  // Detection-type manifest folds (step 3.5)
  //
  // Each line expands one manifest version into an ordinary model version.
  // The global model-version sequence is append-only and totally ordered; both
  // the number and the manifest must stay here permanently once published.
  //
  // As a side effect, fromBuilderManifest() records each (type, version) pair
  // in globalFoldedVersions so the registration-time manifest-consistency
  // check (check 6) can verify every manifest version has been folded.
  //
  // Ref: rule-type-registration.md "The fold into the saved-object registration"
  //      rule-data-migration.md "From manifest version to model version"
  // ---------------------------------------------------------------------------

  // security.detection.query v1: adds the shared detection fragment's typed
  // sub-fields (risk_score, max_signals as integer; note, setup as text) plus
  // `query` as a text sub-field for full-text search. Version 1 needs no
  // backfill — no stored rule carries these fields yet.
  '8': fromBuilderManifest(securityDetectionQueryManifest, 1),

  // security.detection.threshold v1: same fragment sub-fields as the query
  // type (identical declarations merge silently at the mapping assembly) plus
  // `query` as text. No backfill needed for the same reason.
  '9': fromBuilderManifest(securityDetectionThresholdManifest, 1),
};

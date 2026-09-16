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
  DETECTION_RULE_TYPE_OWNERSHIP,
} from '@kbn/security-detection-rule-schema';
import {
  ruleSavedObjectAttributesSchemaV1,
  ruleSavedObjectAttributesSchemaV2,
  ruleSavedObjectAttributesSchemaV3,
  ruleSavedObjectAttributesSchemaV4,
  ruleSavedObjectAttributesSchemaV8,
  ruleSavedObjectAttributesSchemaV9,
} from '../schemas/rule_saved_object_attributes';
import { migrateRuleArtifactsToData } from './migrate_rule_artifacts_to_data';
import { migrateDashboardArtifactDataKey } from './migrate_dashboard_artifact_data_key';
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
    // Introduce `metadata.builder_fields`, the structured parameters a rule
    // builder was configured with. Purely additive and optional, so there is
    // nothing to backfill: rules created before this version keep only their
    // `builder_type` and stay readable.
    //
    // Mapped as `flattened` so leaf values are searchable as keywords (term,
    // exists, prefix queries). Typed sub-fields for numeric range queries can
    // be added per builder type in a future model version.
    //
    // Rolling back to model version 5 is safe: that schema ignores unknown
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
      forwardCompatibility: ruleSavedObjectAttributesSchemaV4.extends({}, { unknowns: 'ignore' }),
      create: ruleSavedObjectAttributesSchemaV4,
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
  '7': fromBuilderManifest(securityDetectionQueryManifest, 1),

  // security.detection.threshold v1: same fragment sub-fields as the query
  // type (identical declarations merge silently at the mapping assembly) plus
  // `query` as text. No backfill needed for the same reason.
  '8': fromBuilderManifest(securityDetectionThresholdManifest, 1),

  // ---------------------------------------------------------------------------
  // Framework rule-model fields (step 4.5)
  //
  // One shared version carrying all four field families added in Phase 4:
  // identity (signature_id), versions (revision), source, and ownership — plus
  // the builder_type keyword mapping that the Detections API filter depends on.
  //
  // The mappings_addition mirrors every field into the static rule_mappings.ts;
  // Kibana core validates at startup that every addition is present verbatim.
  //
  // The data_backfill stamps:
  //   - signature_id  := the rule's own saved-object id (deterministic, unique)
  //   - source        := { type: 'internal', version: 1 } (no lineage to recover)
  //   - revision      := 0 (the "never meaningfully edited" baseline)
  //   - ownership     := type-aware: managed types from DETECTION_RULE_TYPE_OWNERSHIP,
  //                      everything else { managed: false }
  //
  // All four use `?? <default>` so that rules already written by the Phase 4
  // write paths (steps 4.1–4.4) keep their live values when this version's
  // backfill runs during migration.
  //
  // The type-to-ownership map is a plain package constant, not a runtime
  // registry query, so the backfill runs even when the owning plugin is disabled.
  //
  // Ref: rule-identity.md "Storage and migration"
  //      rule-versions.md "Storage and migration"
  //      rule-source.md "Storage and migration"
  //      rule-ownership.md "Storage, mapping, and migration"
  //      rule-types.md "The discriminator must be indexed and filterable"
  // ---------------------------------------------------------------------------
  '9': {
    changes: [
      {
        type: 'mappings_addition',
        addedMappings: {
          metadata: {
            properties: {
              // rule-identity.md: keyword-indexed so find can filter on it
              signature_id: { type: 'keyword', ignore_above: 256 },
              // rule-source.md: type/id as keyword, version as integer
              source: {
                properties: {
                  type: { type: 'keyword', ignore_above: 256 },
                  id: { type: 'keyword', ignore_above: 256 },
                  version: { type: 'integer' },
                },
              },
              // rule-ownership.md: managed/solution/domain for filter + exclusion;
              // app is attribution-only (128-char cap matches SO schema bound)
              ownership: {
                properties: {
                  managed: { type: 'boolean' },
                  solution: { type: 'keyword', ignore_above: 256 },
                  domain: { type: 'keyword', ignore_above: 256 },
                  app: { type: 'keyword', ignore_above: 128 },
                },
              },
              // rule-types.md: builder_type must be keyword-indexed and filterable
              builder_type: { type: 'keyword', ignore_above: 256 },
            },
          },
        },
      },
      {
        type: 'data_backfill',
        backfillFn: (doc) => {
          const builderType = doc.attributes.metadata?.builder_type;
          const ownershipEntry =
            builderType != null ? DETECTION_RULE_TYPE_OWNERSHIP[builderType] : undefined;
          const derivedOwnership = ownershipEntry
            ? {
                managed: true as const,
                solution: ownershipEntry.solution,
                domain: ownershipEntry.domain,
              }
            : { managed: false as const };

          return {
            attributes: {
              metadata: {
                ...doc.attributes.metadata,
                // Preserve an already-set signature_id (set by the 4.1 write path);
                // fall back to the object id for unmigrated rules.
                signature_id: doc.attributes.metadata?.signature_id ?? (doc.id as string),
                // Preserve a declared source; default to internal for unmigrated rules.
                source:
                  doc.attributes.metadata?.source ?? ({ type: 'internal', version: 1 } as const),
                // Preserve a non-zero revision; 0 is the "never edited" baseline.
                revision: doc.attributes.metadata?.revision ?? 0,
                // Preserve a stamped ownership; derive from the type map for managed types.
                ownership: doc.attributes.metadata?.ownership ?? derivedOwnership,
              },
            },
          };
        },
      },
    ],
    schemas: {
      forwardCompatibility: ruleSavedObjectAttributesSchemaV8.extends({}, { unknowns: 'ignore' }),
      create: ruleSavedObjectAttributesSchemaV8,
    },
  },
  // ---------------------------------------------------------------------------
  // Step 6.4: execution-time builder types (query optional)
  //
  // Makes `query` optional on the stored rule. Execution-time builder rules
  // compile their query fresh on every run and persist nothing in the `query`
  // field. Write-time builder rules and plain ES|QL rules keep their stored
  // query unchanged.
  //
  // No backfill needed: existing rules already have a stored query; new
  // execution-time rules simply omit the field.
  //
  // Ref: rule-execution-logic.md "A rule without a persisted query"
  // ---------------------------------------------------------------------------
  '10': {
    changes: [],
    schemas: {
      forwardCompatibility: ruleSavedObjectAttributesSchemaV9.extends({}, { unknowns: 'ignore' }),
      create: ruleSavedObjectAttributesSchemaV9,
    },
  },
};

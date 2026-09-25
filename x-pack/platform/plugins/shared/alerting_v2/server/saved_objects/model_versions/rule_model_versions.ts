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
  ruleSavedObjectAttributesSchemaV10,
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

  // ---------------------------------------------------------------------------
  // SQUASHED POC MODEL VERSION
  //
  // The five entries below ('7' through '11') were individually designed on this
  // POC branch, each carrying its own mappings or backfill and a schema step
  // ('11' was the exception: changes: [] — schema step only, no migration changes).
  // They are squashed here into a single '7' purely to satisfy the saved-objects
  // checker's one-new-version-per-PR rule. The five original entries — with their
  // per-version explanatory comments and Ref: pointers — are preserved verbatim
  // in the commented block further below. An engineer splitting this POC into
  // production PRs should restore the individual versions from that block, remove
  // this squashed entry, re-introduce the matching schema imports (V5, V9) that
  // were removed from the import list above, and rename the checker fixture:
  //   packages/kbn-check-saved-objects-cli/src/migrations/__fixtures__/alerting_rule/
  //     10.7.0.json (keys '10.6.0'/'10.7.0') must become 10.11.0.json with keys
  //     '10.10.0'/'10.11.0', because the fixture is addressed by the highest model
  //     version in the PR ('11' in production, '7' in this squashed form).
  //
  // Changes carried by this squashed '7', in migration order:
  //   1. mappings_addition — metadata.builder_fields as flattened (was '7')
  //   2. fromBuilderManifest(securityDetectionQueryManifest, 1).changes
  //      — typed sub-fields for security.detection.query v1 (was '8')
  //   3. fromBuilderManifest(securityDetectionThresholdManifest, 1).changes
  //      — typed sub-fields for security.detection.threshold v1 (was '9')
  //   4. mappings_addition — framework field families: signature_id, source,
  //      ownership, builder_type (was '10')
  //   5. data_backfill — stamps all four field families on migrating rules (was '10')
  //   (was '11': changes: [] — no changes; only advanced the schema to V9)
  //
  // Order is load-bearing: every mappings_addition must precede the backfill
  // that writes into those fields, exactly as the cross-version order had it.
  //
  // The fromBuilderManifest() calls must remain actual calls (not inlined data)
  // because addFoldedVersion() records (type, n) in a global registry that the
  // registration-time manifest-consistency check (check 6) reads. Spreading
  // .changes from the call preserves that side effect.
  //
  // The schemas block is '11's, verbatim (ruleSavedObjectAttributesSchemaV10),
  // because that was the last schema step in the POC sequence.
  //
  // Ref: (all original Ref: pointers are in the commented block below)
  // ---------------------------------------------------------------------------
  '7': {
    changes: [
      // was '7': introduce metadata.builder_fields as flattened
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
      // was '8': security.detection.query v1 typed sub-fields
      ...fromBuilderManifest(securityDetectionQueryManifest, 1).changes,
      // was '9': security.detection.threshold v1 typed sub-fields
      ...fromBuilderManifest(securityDetectionThresholdManifest, 1).changes,
      // was '10': framework field families (identity, versions, source, ownership, builder_type)
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
      // was '10': backfill stamps all four field families
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
    // schemas from '11' (the final schema step in the POC sequence)
    schemas: {
      forwardCompatibility: ruleSavedObjectAttributesSchemaV10.extends({}, { unknowns: 'ignore' }),
      create: ruleSavedObjectAttributesSchemaV10,
    },
  },

  // ---------------------------------------------------------------------------
  // ORIGINAL POC MODEL VERSIONS — kept verbatim for reference
  //
  // These are the five individually designed model versions from this POC branch.
  // They were squashed into the single '7' above only to satisfy the saved-objects
  // checker's one-new-version-per-PR rule. An engineer splitting this work into
  // production PRs should:
  //   1. Restore these entries as live code.
  //   2. Remove the squashed '7' above.
  //   3. Re-add the imports for ruleSavedObjectAttributesSchemaV5 and
  //      ruleSavedObjectAttributesSchemaV9 (removed from the import list above
  //      because they were only referenced by the now-squashed entries).
  //   4. Rename the checker fixture back: the file
  //        packages/kbn-check-saved-objects-cli/src/migrations/__fixtures__/
  //        alerting_rule/10.7.0.json (keys '10.6.0'/'10.7.0')
  //      must become 10.11.0.json with top-level keys '10.10.0'/'10.11.0'.
  //      The checker resolves the fixture by the PR's highest model version
  //      (10.11.0 in production, 10.7.0 in this squashed form) and requires
  //      the two keys to match the current and previous version exactly.
  // ---------------------------------------------------------------------------

  // '7': {
  //   // Introduce `metadata.builder_fields`, the structured parameters a rule
  //   // builder was configured with. Purely additive and optional, so there is
  //   // nothing to backfill: rules created before this version keep only their
  //   // `builder_type` and stay readable.
  //   //
  //   // Mapped as `flattened` so leaf values are searchable as keywords (term,
  //   // exists, prefix queries). Typed sub-fields for numeric range queries can
  //   // be added per builder type in a future model version.
  //   //
  //   // Rolling back to model version 6 is safe: that schema ignores unknown
  //   // attributes on read, so a rule carrying builder fields still loads, with
  //   // the query it was already storing. The flattened mapping is ignored by
  //   // older code — unmapped fields in `_source` are harmless.
  //   changes: [
  //     {
  //       type: 'mappings_addition',
  //       addedMappings: {
  //         metadata: {
  //           properties: {
  //             builder_fields: { type: 'flattened', ignore_above: 4096 },
  //           },
  //         },
  //       },
  //     },
  //   ],
  //   schemas: {
  //     forwardCompatibility: ruleSavedObjectAttributesSchemaV5.extends({}, { unknowns: 'ignore' }),
  //     create: ruleSavedObjectAttributesSchemaV5,
  //   },
  // },
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
  // '8': fromBuilderManifest(securityDetectionQueryManifest, 1),

  // security.detection.threshold v1: same fragment sub-fields as the query
  // type (identical declarations merge silently at the mapping assembly) plus
  // `query` as text. No backfill needed for the same reason.
  // '9': fromBuilderManifest(securityDetectionThresholdManifest, 1),

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
  // '10': {
  //   changes: [
  //     {
  //       type: 'mappings_addition',
  //       addedMappings: {
  //         metadata: {
  //           properties: {
  //             // rule-identity.md: keyword-indexed so find can filter on it
  //             signature_id: { type: 'keyword', ignore_above: 256 },
  //             // rule-source.md: type/id as keyword, version as integer
  //             source: {
  //               properties: {
  //                 type: { type: 'keyword', ignore_above: 256 },
  //                 id: { type: 'keyword', ignore_above: 256 },
  //                 version: { type: 'integer' },
  //               },
  //             },
  //             // rule-ownership.md: managed/solution/domain for filter + exclusion;
  //             // app is attribution-only (128-char cap matches SO schema bound)
  //             ownership: {
  //               properties: {
  //                 managed: { type: 'boolean' },
  //                 solution: { type: 'keyword', ignore_above: 256 },
  //                 domain: { type: 'keyword', ignore_above: 256 },
  //                 app: { type: 'keyword', ignore_above: 128 },
  //               },
  //             },
  //             // rule-types.md: builder_type must be keyword-indexed and filterable
  //             builder_type: { type: 'keyword', ignore_above: 256 },
  //           },
  //         },
  //       },
  //     },
  //     {
  //       type: 'data_backfill',
  //       backfillFn: (doc) => {
  //         const builderType = doc.attributes.metadata?.builder_type;
  //         const ownershipEntry =
  //           builderType != null ? DETECTION_RULE_TYPE_OWNERSHIP[builderType] : undefined;
  //         const derivedOwnership = ownershipEntry
  //           ? {
  //               managed: true as const,
  //               solution: ownershipEntry.solution,
  //               domain: ownershipEntry.domain,
  //             }
  //           : { managed: false as const };
  //
  //         return {
  //           attributes: {
  //             metadata: {
  //               ...doc.attributes.metadata,
  //               // Preserve an already-set signature_id (set by the 4.1 write path);
  //               // fall back to the object id for unmigrated rules.
  //               signature_id: doc.attributes.metadata?.signature_id ?? (doc.id as string),
  //               // Preserve a declared source; default to internal for unmigrated rules.
  //               source:
  //                 doc.attributes.metadata?.source ?? ({ type: 'internal', version: 1 } as const),
  //               // Preserve a non-zero revision; 0 is the "never edited" baseline.
  //               revision: doc.attributes.metadata?.revision ?? 0,
  //               // Preserve a stamped ownership; derive from the type map for managed types.
  //               ownership: doc.attributes.metadata?.ownership ?? derivedOwnership,
  //             },
  //           },
  //         };
  //       },
  //     },
  //   ],
  //   schemas: {
  //     forwardCompatibility: ruleSavedObjectAttributesSchemaV9.extends({}, { unknowns: 'ignore' }),
  //     create: ruleSavedObjectAttributesSchemaV9,
  //   },
  // },
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
  // '11': {
  //   changes: [],
  //   schemas: {
  //     forwardCompatibility: ruleSavedObjectAttributesSchemaV10.extends({}, { unknowns: 'ignore' }),
  //     create: ruleSavedObjectAttributesSchemaV10,
  //   },
  // },
};

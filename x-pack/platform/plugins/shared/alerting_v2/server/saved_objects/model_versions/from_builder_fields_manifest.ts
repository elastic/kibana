/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObjectType } from '@kbn/config-schema';
import type {
  SavedObjectsModelVersion,
  SavedObjectsMappingProperties,
} from '@kbn/core-saved-objects-server';
import type { BuilderFieldsManifest, MappingProperty } from '@kbn/alerting-v2-rule-builders';
import { BUILDER_FIELDS_IGNORE_ABOVE } from '@kbn/alerting-v2-constants';
import { addFoldedManifest } from '../../lib/builder_types/folded_versions';
import { currentRuleSavedObjectAttributesSchema } from '../schemas/rule_saved_object_attributes';

// ---------------------------------------------------------------------------
// Open-record assertion
//
// Assert at module load that the persisted attributes schema keeps
// `metadata.builder_fields` as an open record (schema.recordOf). This is the
// property that allows rolled-back framework code to read rules written by
// newer manifest versions: new builder fields are not unknown *attributes*
// but keys inside the open container, preserved intact rather than stripped.
//
// If someone tightens `ruleMetadataSchema` (e.g. replaces the recordOf with a
// fixed-key object schema) and also edits the companion test, the violation
// will still be caught here at plugin load time.
//
// Ref: rule-data-migration.md "Rollback behavior"
//      rule-type-registration.md "The fold into the saved-object registration"
// ---------------------------------------------------------------------------
assertBuilderFieldsIsOpenRecord();

/**
 * Validates at runtime that the current persisted attributes schema accepts
 * arbitrary unknown keys in `metadata.builder_fields`.
 *
 * Throws if the schema rejects an object with an unrecognised key inside
 * `builder_fields`, which means the container has been tightened from an open
 * record to a closed schema — breaking rollback compatibility.
 *
 * Called once at module load (see the IIFE above). Exported so that tests can
 * invoke it directly to verify the assertion function itself is correct.
 */
export function assertBuilderFieldsIsOpenRecord(): void {
  // A minimal valid rule attributes document.  builder_fields carries one
  // deliberately unknown key to exercise the open-record property.
  const testDoc = {
    kind: 'alert' as const,
    metadata: { name: '__open_record_check__', builder_fields: { __future_field__: true } },
    time_field: '@timestamp',
    schedule: { every: '1m' },
    query: { base: 'FROM logs-* | LIMIT 1' },
    recovery: { strategy: 'manual' as const },
    no_data: { strategy: 'ignore' as const },
    enabled: false,
    createdBy: null,
    updatedBy: null,
    createdAt: '1970-01-01T00:00:00.000Z',
    updatedAt: '1970-01-01T00:00:00.000Z',
  };

  try {
    currentRuleSavedObjectAttributesSchema.validate(testDoc);
  } catch (err) {
    throw new Error(
      `alerting_v2: the persisted attributes schema no longer accepts arbitrary unknown ` +
        `keys in metadata.builder_fields — it must stay an open record ` +
        `(schema.recordOf(schema.string(), schema.any())) so that rolled-back code can ` +
        `read rules written by newer manifest versions without stripping builder fields. ` +
        `See rule-data-migration.md "Rollback behavior". Original error: ${String(err)}`
    );
  }
}

/**
 * Expands version `n` of a builder fields manifest into an ordinary
 * saved-object model version.
 *
 * - `addedMappings` becomes a `mappings_addition` reaching nothing but
 *   `metadata.builder_fields.properties`.
 * - Each entry of `backfills` becomes its own `data_backfill`, guarded on the
 *   rule's stored `metadata.builder_type` against that entry's `builderTypes`.
 *   Rules of any type not in the entry's `builderTypes` are written back
 *   unchanged.
 * - `schemas.create` is set to `attributesSchema` and `schemas.forwardCompatibility`
 *   to the same schema with unknown attributes ignored. The reference is to a
 *   frozen schema module, never to the `current` alias, so that CI's schema-hash
 *   comparison does not trigger the `validateAllMappingsInModelVersion` check.
 * - **No auto-injected identity backfill.** Core selects documents to rewrite by
 *   `typeMigrationVersion` alone on both migration algorithms, so a version carrying
 *   only a `mappings_addition` already rewrites every rule. No identity backfill is
 *   needed and none is added.
 * - Records the fold in the global FoldedVersionsSet (keyed by manifest, not by
 *   type) so the fold-completeness check and the registration-time checks can
 *   verify that every manifest version has been expanded into a model version.
 *
 * Core's three other change kinds stay out:
 * - `unsafe_transform`: receives the whole document; nothing could stop a
 *   solution function from rewriting `kind` or `schedule`.
 * - `data_removal`: safe only once a previously published version stopped
 *   requiring the path; a manifest knows its own history, not the sequence of
 *   published Kibana releases.
 * - `mappings_deprecation`: has nothing to act on while no sub-field has been
 *   retired.
 *
 * A version may carry several backfills because model versions are scarce. Each
 * entry names its own types; no type appears in two entries of one version (that
 * is step B.4's manifest-shape check); and each becomes its own guarded
 * `data_backfill`.
 *
 * Ref: builder-type-registration-redesign.md "How stored builder fields evolve"
 *      builder-type-registration-redesign.md "The schemas a folded version carries"
 *      builder-type-registration-redesign.md "Assembling the saved-object type"
 */
export function fromBuilderFieldsManifest(
  manifest: BuilderFieldsManifest,
  n: number,
  attributesSchema: ObjectType<any>
): SavedObjectsModelVersion {
  // Record the fold so the fold-completeness check (in saved_objects/index.ts)
  // and the managed-type completeness check (check 7) can verify coverage.
  addFoldedManifest(manifest, n);

  const manifestVersion = manifest.versions[n];
  if (!manifestVersion) {
    throw new Error(
      `Builder fields manifest for [${manifest.builderTypes.join(', ')}] has no version ${n}`
    );
  }

  const changes: SavedObjectsModelVersion['changes'] = [];
  const { addedMappings, backfills } = manifestVersion;
  const hasMappings = addedMappings != null && Object.keys(addedMappings).length > 0;

  // mappings_addition: declare the new typed sub-fields under
  // metadata.builder_fields.properties. Core requires every mappings_addition
  // to be verbatim present in the type's static mappings (rule_mappings.ts).
  if (hasMappings) {
    changes.push({
      type: 'mappings_addition',
      addedMappings: buildMappingsAddition(addedMappings!),
    });
  }

  // Each backfill entry becomes its own guarded data_backfill, scoped to the
  // builder types that entry names. This is correct even when a version carries
  // several backfills for different type sets.
  if (backfills && backfills.length > 0) {
    for (const backfill of backfills) {
      changes.push({
        type: 'data_backfill',
        backfillFn: buildScopedBackfillFn(backfill.builderTypes, backfill.migrate),
      });
    }
  }

  return {
    changes,
    schemas: {
      create: attributesSchema,
      forwardCompatibility: attributesSchema.extends({}, { unknowns: 'ignore' }),
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds the `addedMappings` structure for a mappings_addition change.
 *
 * The manifest's sub-field mappings (keyed by leaf path in dot notation) are
 * wrapped in the full `metadata.builder_fields.properties` nesting that core
 * expects. The `flattened` type and `ignore_above` come from the static
 * mappings (rule_mappings.ts) and are repeated here because core validates
 * that every mappings_addition is verbatim present in the type's static
 * mappings.
 *
 * The cast on `addedMappings` is needed because our `MappingProperty` union is
 * a narrower allowlist than the ES client's `EsMappingProperty` union; every
 * member of our union is a valid `EsMappingProperty`, so the cast is safe.
 */
function buildMappingsAddition(
  addedMappings: Record<string, MappingProperty>
): SavedObjectsMappingProperties {
  return {
    metadata: {
      properties: {
        builder_fields: {
          type: 'flattened',
          ignore_above: BUILDER_FIELDS_IGNORE_ABOVE,
          // Cast: our MappingProperty union is narrower than EsMappingProperty
          // (it is an allowlist of the types that work reliably as flattened
          // sub-fields). Every member is a valid EsMappingProperty.
          properties: addedMappings as Record<string, SavedObjectsMappingProperties[string]>,
        },
      },
    },
  };
}

/**
 * Returns a data_backfill function that:
 * 1. Skips documents whose `metadata.builder_type` is not in `builderTypes`
 *    (type scoping: a backfill runs only on rules of the named types).
 * 2. Passes the document's `metadata.builder_fields` through `migrate` and
 *    returns the result confined to that container.
 *
 * Core deep-merges the returned `attributes` into the document, so returning
 * `{ attributes: {} }` is a true no-op for non-matching documents.
 *
 * A rule outside the scope is written back unchanged. This is what keeps one
 * type's backfill from rewriting another type's fields in the shared container.
 *
 * Ref: builder-type-registration-redesign.md "How stored builder fields evolve"
 */
function buildScopedBackfillFn(
  builderTypes: string[],
  migrate: (fields: Record<string, unknown>) => Record<string, unknown>
): (doc: { attributes?: any }, ctx: unknown) => { attributes: Record<string, unknown> } {
  const typeSet = new Set(builderTypes);
  return (doc) => {
    const builderType = doc.attributes?.metadata?.builder_type;

    // Type scoping: only rewrite documents for the named builder types.
    if (!typeSet.has(builderType)) {
      return { attributes: {} };
    }

    const builderFields: Record<string, unknown> = doc.attributes?.metadata?.builder_fields ?? {};

    return {
      attributes: {
        metadata: {
          builder_fields: migrate(builderFields),
        },
      },
    };
  };
}

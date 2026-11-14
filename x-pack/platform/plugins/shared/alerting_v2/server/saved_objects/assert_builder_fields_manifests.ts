/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  KEYWORD_SUB_FIELD_IGNORE_ABOVE,
  type BuilderFieldsManifest,
  type MappingProperty,
} from '@kbn/alerting-v2-rule-builders';
import type { FoldedVersionsRecord } from '../lib/builder_types/folded_versions';

/**
 * Runs four build-time checks over every manifest in the list. Throws at the
 * first violation, naming the path and the manifest. Called at module load from
 * builder_fields_manifests.ts, so any test or boot that loads BUILDER_FIELDS_MANIFESTS
 * exercises all four.
 *
 * The fifth check, fold completeness, is assertFoldCompleteness below, which
 * runs from saved_objects/index.ts after the model versions are loaded.
 *
 * Ref: builder-type-registration-redesign.md "Build-time checks"
 */
export function assertBuilderFieldsManifests(manifests: BuilderFieldsManifest[]): void {
  for (const manifest of manifests) {
    assertManifestShape(manifest);
    assertKeywordCeiling(manifest);
    assertMappingEquality(manifest);
  }
  assertCrossSolutionLeafConflict(manifests);
}

/**
 * Fold completeness: every version of every manifest in the list must have a
 * corresponding fold line in rule_model_versions.ts (registered via
 * fromBuilderFieldsManifest). Throws at the first missing fold, naming the
 * manifest and the version number.
 *
 * Takes its inputs as parameters so it can be tested against fixtures.
 * Called from saved_objects/index.ts with BUILDER_FIELDS_MANIFESTS and
 * globalFoldedVersions after ruleModelVersions is imported (which triggers
 * fold registration as a side effect of loading fromBuilderFieldsManifest).
 *
 * A spread fold (where .changes is spread into a squashed version) counts the
 * same as a whole fold, because addFoldedManifest() is called inside
 * fromBuilderFieldsManifest() regardless of how its .changes are consumed.
 *
 * Ref: builder-type-registration-redesign.md "Build-time checks"
 */
export function assertFoldCompleteness(
  manifests: BuilderFieldsManifest[],
  foldedVersions: FoldedVersionsRecord
): void {
  for (const manifest of manifests) {
    const versionKeys = Object.keys(manifest.versions).map(Number);
    for (const n of versionKeys) {
      if (!foldedVersions.hasManifestVersion(manifest, n)) {
        throw new Error(
          `Builder fields manifest for [${manifest.builderTypes.join(', ')}] version ${n} ` +
            `has no fold line in rule_model_versions.ts. ` +
            `Add a fromBuilderFieldsManifest(manifest, ${n}, schema) call and spread its ` +
            `.changes into the corresponding model version ` +
            `(builder-type-registration-redesign.md "Assembling the saved-object type").`
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Individual checks
// ---------------------------------------------------------------------------

/**
 * Manifest shape: versions are dense from 1, currentVersion equals the highest
 * key, no backfill names a type outside the manifest's builderTypes, and no
 * builder type appears in two backfills of one version.
 */
function assertManifestShape(manifest: BuilderFieldsManifest): void {
  const versionKeys = Object.keys(manifest.versions)
    .map(Number)
    .sort((a, b) => a - b);

  // Dense from 1: the keys must be 1, 2, 3, ..., N without gaps.
  for (let i = 0; i < versionKeys.length; i++) {
    const expected = i + 1;
    if (versionKeys[i] !== expected) {
      throw new Error(
        `Builder fields manifest shape error for [${manifest.builderTypes.join(', ')}]: ` +
          `versions must be dense from 1 but found key ${versionKeys[i]} where ${expected} was expected. ` +
          `Actual keys: [${versionKeys.join(', ')}].`
      );
    }
  }

  // currentVersion must equal the highest key.
  const highestKey = versionKeys.length > 0 ? versionKeys[versionKeys.length - 1] : 0;
  if (manifest.currentVersion !== highestKey) {
    throw new Error(
      `Builder fields manifest shape error for [${manifest.builderTypes.join(', ')}]: ` +
        `currentVersion (${manifest.currentVersion}) must equal the highest version key (${highestKey}).`
    );
  }

  // Per-version backfill checks.
  for (const [versionKey, version] of Object.entries(manifest.versions)) {
    if (!version.backfills) continue;

    const seenTypesInVersion = new Set<string>();

    for (const backfill of version.backfills) {
      for (const builderType of backfill.builderTypes) {
        // Type must be within the manifest's own builderTypes.
        if (!manifest.builderTypes.includes(builderType)) {
          throw new Error(
            `Builder fields manifest shape error for [${manifest.builderTypes.join(', ')}]: ` +
              `version ${versionKey} backfill names builder type "${builderType}" which is not ` +
              `in the manifest's builderTypes [${manifest.builderTypes.join(', ')}].`
          );
        }

        // A type must not appear in two backfills of the same version.
        if (seenTypesInVersion.has(builderType)) {
          throw new Error(
            `Builder fields manifest shape error for [${manifest.builderTypes.join(', ')}]: ` +
              `version ${versionKey} has builder type "${builderType}" in more than one backfill. ` +
              `Each builder type may appear in at most one backfill per version.`
          );
        }
        seenTypesInVersion.add(builderType);
      }
    }
  }
}

/**
 * Keyword ceiling: every keyword sub-field in currentMappings must carry
 * ignore_above <= KEYWORD_SUB_FIELD_IGNORE_ABOVE.
 */
function assertKeywordCeiling(manifest: BuilderFieldsManifest): void {
  for (const [path, mapping] of Object.entries(manifest.currentMappings)) {
    if (mapping.type === 'keyword' && mapping.ignore_above > KEYWORD_SUB_FIELD_IGNORE_ABOVE) {
      throw new Error(
        `Builder fields manifest keyword ceiling violation for [${manifest.builderTypes.join(
          ', '
        )}]: ` +
          `path "${path}" has ignore_above ${mapping.ignore_above} which exceeds ` +
          `KEYWORD_SUB_FIELD_IGNORE_ABOVE (${KEYWORD_SUB_FIELD_IGNORE_ABOVE}). ` +
          `Every keyword sub-field must keep its ignore_above at or below this ceiling ` +
          `so that no accepted value can fail the Lucene term-length limit.`
      );
    }
  }
}

/**
 * Mapping equality: merging every version's addedMappings must produce exactly
 * the manifest's currentMappings. A leaf in the history and not in currentMappings
 * means a version shipped without the static mapping to back it. A leaf in
 * currentMappings and in no version means a mapping that nothing ever migrated
 * rules under. Both fail.
 */
function assertMappingEquality(manifest: BuilderFieldsManifest): void {
  // Accumulate all paths and their declarations from the version history.
  const fromHistory = new Map<string, MappingProperty>();

  for (const [versionKey, version] of Object.entries(manifest.versions)) {
    if (!version.addedMappings) continue;

    for (const [path, mapping] of Object.entries(version.addedMappings)) {
      if (fromHistory.has(path)) {
        // A path declared in two versions must be identical; if it differs, that is
        // a version-history inconsistency. (mergeBuilderFieldMappings would also catch
        // this when assembling currentMappings, but we report it here with manifest context.)
        const existing = fromHistory.get(path)!;
        if (!isMappingEqual(existing, mapping)) {
          throw new Error(
            `Builder fields manifest mapping equality error for [${manifest.builderTypes.join(
              ', '
            )}]: ` +
              `path "${path}" is declared in two versions with different sub-field types. ` +
              `Once a mapping is published it must not change; a new leaf path is the correct ` +
              `evolution. Version ${versionKey} differs from the earlier declaration.`
          );
        }
        // Identical duplicate — keep the existing entry.
      } else {
        fromHistory.set(path, mapping);
      }
    }
  }

  const currentPaths = new Set(Object.keys(manifest.currentMappings));
  const historyPaths = new Set(fromHistory.keys());

  // Leaf in the history but not in currentMappings.
  for (const path of historyPaths) {
    if (!currentPaths.has(path)) {
      throw new Error(
        `Builder fields manifest mapping equality error for [${manifest.builderTypes.join(
          ', '
        )}]: ` +
          `path "${path}" appears in the version history but not in currentMappings. ` +
          `Every mapping a version declares must be present in currentMappings so that ` +
          `core's startup check (validateAddedMappings) passes.`
      );
    }
  }

  // Leaf in currentMappings but in no version.
  for (const path of currentPaths) {
    if (!historyPaths.has(path)) {
      throw new Error(
        `Builder fields manifest mapping equality error for [${manifest.builderTypes.join(
          ', '
        )}]: ` +
          `path "${path}" appears in currentMappings but in no version's addedMappings. ` +
          `Every mapping in currentMappings must correspond to a version that migrated rules ` +
          `under it; a mapping with no version is never re-indexed on existing deployments.`
      );
    }
  }

  // Values must also match for paths that appear in both.
  for (const path of currentPaths) {
    const fromHistoryMapping = fromHistory.get(path)!;
    const currentMapping = manifest.currentMappings[path];
    if (!isMappingEqual(fromHistoryMapping, currentMapping)) {
      throw new Error(
        `Builder fields manifest mapping equality error for [${manifest.builderTypes.join(
          ', '
        )}]: ` +
          `path "${path}" has different declarations in the version history and in currentMappings. ` +
          `History declares: ${JSON.stringify(fromHistoryMapping)}, ` +
          `currentMappings declares: ${JSON.stringify(currentMapping)}.`
      );
    }
  }
}

/**
 * Cross-solution leaf conflict: two manifests may not declare the same leaf path
 * with different sub-field types. Identical declarations merge silently.
 * Names both manifests' builderTypes and the conflicting path.
 */
function assertCrossSolutionLeafConflict(manifests: BuilderFieldsManifest[]): void {
  // Track which manifest first declared each path, along with the mapping.
  const pathToInfo = new Map<
    string,
    { mapping: MappingProperty; manifest: BuilderFieldsManifest }
  >();

  for (const manifest of manifests) {
    for (const [path, mapping] of Object.entries(manifest.currentMappings)) {
      const existing = pathToInfo.get(path);
      if (existing) {
        if (!isMappingEqual(existing.mapping, mapping)) {
          throw new Error(
            `Builder fields cross-solution leaf conflict at path "${path}": ` +
              `manifest [${existing.manifest.builderTypes.join(', ')}] declares ` +
              `${JSON.stringify(sortObjectKeys(existing.mapping))}, but ` +
              `manifest [${manifest.builderTypes.join(', ')}] declares ` +
              `${JSON.stringify(sortObjectKeys(mapping))}. ` +
              `Identical declarations merge silently; differing declarations fail the build.`
          );
        }
        // Identical — merge silently, keep the existing entry.
      } else {
        pathToInfo.set(path, { mapping, manifest });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isMappingEqual(a: MappingProperty, b: MappingProperty): boolean {
  return JSON.stringify(sortObjectKeys(a)) === JSON.stringify(sortObjectKeys(b));
}

function sortObjectKeys(obj: object): object {
  return Object.fromEntries(Object.entries(obj).sort(([ka], [kb]) => ka.localeCompare(kb)));
}

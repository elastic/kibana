/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuilderFieldsManifest } from '@kbn/alerting-v2-rule-builders';

/**
 * Records which manifests and (type, version) pairs have been folded into
 * alerting_v2's model versions via fromBuilderFieldsManifest() calls in
 * rule_model_versions.ts.
 *
 * The manifest-consistency check (check 6 of registerBuilderType) consults
 * this record via `has(type, version)` to verify that every manifest version
 * declared in a BuilderTypeDefinition has been expanded into a model version.
 *
 * Step B.5 populates the global instance via addFoldedManifest(); tests pass
 * a locally constructed FoldedVersionsSet as a fixture.
 */
export interface FoldedVersionsRecord {
  /** Returns true if (type, version) has been folded into a model version. */
  has(type: string, version: number): boolean;

  /**
   * Returns true if the manifest+version pair has been folded. Used by the
   * fold-completeness check in saved_objects/index.ts.
   */
  hasManifestVersion(manifest: BuilderFieldsManifest, version: number): boolean;

  /**
   * Returns the folded manifest that covers this builder type, or undefined
   * if no folded manifest declares the type. Used by step B.7's
   * managed-type completeness check.
   */
  getManifestForType(type: string): BuilderFieldsManifest | undefined;
}

/**
 * Mutable implementation of FoldedVersionsRecord. Tests construct fresh
 * instances; the module-level globalFoldedVersions is the production singleton.
 */
export class FoldedVersionsSet implements FoldedVersionsRecord {
  // (type:version) strings from per-type records and derived from manifests.
  private readonly entries = new Set<string>();

  // (manifest, version) pairs for hasManifestVersion and fold-completeness.
  private readonly manifestEntries: Array<{ manifest: BuilderFieldsManifest; version: number }> =
    [];

  // builder type id → the manifest that covers it.
  private readonly manifestForType = new Map<string, BuilderFieldsManifest>();

  /**
   * Record that (type, version) has been folded. Used by tests that inject a
   * manifest-unaware fixture (e.g. builder_type_registry.test.ts).
   */
  record(type: string, version: number): void {
    this.entries.add(`${type}:${version}`);
  }

  /**
   * Record that (manifest, version) has been folded. Derives (type, version)
   * entries for every type the manifest covers, so that `has(type, version)`
   * returns true for each of them. Called by addFoldedManifest().
   */
  recordManifest(manifest: BuilderFieldsManifest, version: number): void {
    this.manifestEntries.push({ manifest, version });
    for (const type of manifest.builderTypes) {
      this.entries.add(`${type}:${version}`);
      // Store the type → manifest mapping (first manifest wins if duplicated).
      if (!this.manifestForType.has(type)) {
        this.manifestForType.set(type, manifest);
      }
    }
  }

  has(type: string, version: number): boolean {
    return this.entries.has(`${type}:${version}`);
  }

  hasManifestVersion(manifest: BuilderFieldsManifest, version: number): boolean {
    return this.manifestEntries.some(
      (entry) => entry.manifest === manifest && entry.version === version
    );
  }

  getManifestForType(type: string): BuilderFieldsManifest | undefined {
    return this.manifestForType.get(type);
  }
}

/**
 * The production singleton, populated by addFoldedManifest() which is called
 * from fromBuilderFieldsManifest() in rule_model_versions.ts (step B.5). The
 * BuilderTypeRegistry reads this by default; tests inject a fixture instead.
 */
export const globalFoldedVersions = new FoldedVersionsSet();

/**
 * Called by fromBuilderFieldsManifest() (step B.5) to record that (manifest, version)
 * has been folded into alerting_v2's model versions. Derives per-type entries so
 * the registry's manifest-consistency check (check 6) can verify that every
 * manifest version declared in a BuilderTypeDefinition has been expanded.
 */
export function addFoldedManifest(manifest: BuilderFieldsManifest, version: number): void {
  globalFoldedVersions.recordManifest(manifest, version);
}

/**
 * @deprecated Use addFoldedManifest() instead. Kept for test-fixture backward
 * compatibility (builder_type_registry.test.ts and assert_valid_definition.test.ts
 * construct FoldedVersionsSet fixtures that call record() directly).
 */
export function addFoldedVersion(type: string, version: number): void {
  globalFoldedVersions.record(type, version);
}

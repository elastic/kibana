/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The two top-level privileges that can have "minimal" (sub-feature-free) variants, and that
 * therefore support versioning via {@link MinimalPrivilegeVersion}.
 */
export type MinimalPrivilegeBase = 'all' | 'read';

/**
 * A reference to one or more privileges of a feature. Structurally compatible with
 * `FeatureKibanaPrivilegesReference` from `@kbn/features-plugin/common` — duplicated here
 * (rather than imported) so this package doesn't need a dependency on the features plugin.
 */
export interface MinimalPrivilegeVersionReference {
  feature: string;
  privileges: readonly string[];
}

/**
 * One entry in a top-level privilege's version history. Structurally compatible with
 * `PrivilegeVersion` from `@kbn/features-plugin/common`. See that type's documentation for the
 * authoring contract (append-only, sequential `version` suffixes).
 */
export interface MinimalPrivilegeVersion {
  version: string;
  extractedInto: readonly MinimalPrivilegeVersionReference[];
}

/**
 * Returns every minimal privilege id ever minted for `basePrivilegeId`, oldest (and most
 * permissive) first, ending with the current/live id that all new role customizations must use.
 *
 * With no version history, this is just `['minimal_<basePrivilegeId>']` — today's only id.
 */
export function getAllMinimalPrivilegeIds(
  basePrivilegeId: MinimalPrivilegeBase,
  privilegeVersions?: readonly MinimalPrivilegeVersion[]
): string[] {
  const bareId = `minimal_${basePrivilegeId}`;
  return [bareId, ...(privilegeVersions ?? []).map(({ version }) => `${bareId}_${version}`)];
}

/**
 * Returns the current (latest) minimal privilege id for `basePrivilegeId` — the one every new
 * role customization must persist.
 */
export function getCurrentMinimalPrivilegeId(
  basePrivilegeId: MinimalPrivilegeBase,
  privilegeVersions?: readonly MinimalPrivilegeVersion[]
): string {
  const ids = getAllMinimalPrivilegeIds(basePrivilegeId, privilegeVersions);
  return ids[ids.length - 1];
}

/**
 * Returns true if `privilegeId` is any minted minimal variant (current or legacy) of
 * `basePrivilegeId`, given its version history.
 */
export function isAnyMinimalPrivilegeId(
  privilegeId: string,
  basePrivilegeId: MinimalPrivilegeBase,
  privilegeVersions?: readonly MinimalPrivilegeVersion[]
): boolean {
  return getAllMinimalPrivilegeIds(basePrivilegeId, privilegeVersions).includes(privilegeId);
}

/**
 * Returns the sub-feature privilege references that must be added to `privilegeId` (a specific
 * minimal privilege id for `basePrivilegeId`, current or legacy) to compute what it actually
 * grants: for a legacy id, everything extracted out *after* it was minted; for the current id,
 * nothing (empty array). Returns an empty array if `privilegeId` isn't a recognized minimal
 * variant of `basePrivilegeId` at all.
 *
 * The same fold serves two call sites: at Elasticsearch-registration time, computing the actions
 * to register under every minted name; and at role-deserialization time, computing what a role
 * holding a legacy name should be treated as also granting, for display/edit purposes only.
 */
export function getReferencesExtractedAfter(
  privilegeId: string,
  basePrivilegeId: MinimalPrivilegeBase,
  privilegeVersions?: readonly MinimalPrivilegeVersion[]
): readonly MinimalPrivilegeVersionReference[] {
  const versions = privilegeVersions ?? [];
  const ids = getAllMinimalPrivilegeIds(basePrivilegeId, versions);
  const index = ids.indexOf(privilegeId);
  if (index === -1) {
    return [];
  }

  // `ids[0]` is the unversioned baseline and corresponds to "everything ever extracted"
  // (`versions.slice(0)`, i.e. the full list); `ids[i]` (i >= 1) corresponds to `versions[i - 1]`
  // having just been minted, so it's missing that entry's own grant but not any later one
  // (`versions.slice(i)`). The current/live id is always `ids[ids.length - 1]`, for which
  // `versions.slice(versions.length)` is empty, as expected.
  return versions.slice(index).flatMap(({ extractedInto }) => extractedInto);
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';

import type { Installation, PackagePolicy } from '../../../types';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE, SO_SEARCH_LIMIT } from '../../../constants';
import { PackageRemovalError } from '../../../errors';
import { appContextService, packagePolicyService } from '../..';

import { assertPrivilegesInSpaces } from '../../security/assert_privileges_in_spaces';

import { getInstallationObject } from '.';

/**
 * Collects all space IDs that would be affected by uninstalling a package,
 * including all auto-installed dependencies in the closure.
 *
 * Returns the combined set of space IDs plus a flag indicating whether the
 * policy list was truncated (which the caller should treat as fail-closed).
 */
export async function collectSpacesForUninstallClosure(
  savedObjectsClient: SavedObjectsClientContract,
  rootInstallation: Installation,
  rootPackagePolicies: PackagePolicy[],
  // beingRemoved tracks every package already decided to be removed in this closure.
  // A shared transitive dep C (depended on by both A and B) will be removed at runtime
  // once its last dependant is removed — so we must include it when all its dependants
  // are in beingRemoved, not just the current root.
  beingRemoved: Set<string> = new Set()
): Promise<{ spaceIds: Set<string>; truncated: boolean }> {
  const spaceIds = new Set<string>();
  let truncated = false;

  function addFromInstallationAndPolicies(
    installation: Installation,
    packagePolicies: PackagePolicy[]
  ) {
    for (const policy of packagePolicies) {
      if (policy.spaceIds && policy.spaceIds.length > 0) {
        for (const spaceId of policy.spaceIds) {
          spaceIds.add(spaceId);
        }
      }
    }
    spaceIds.add(installation.installed_kibana_space_id ?? DEFAULT_SPACE_ID);
    for (const spaceId of Object.keys(installation.additional_spaces_installed_kibana ?? {})) {
      spaceIds.add(spaceId);
    }
  }

  addFromInstallationAndPolicies(rootInstallation, rootPackagePolicies);
  beingRemoved.add(rootInstallation.name);

  // Mirror the feature-flag guard in cleanupDependenciesStep: when dependency
  // resolution is disabled the cleanup step does nothing, so we must not
  // pre-authorize dependency spaces either (it would 403 callers who can manage
  // the parent but not an incidentally-installed dep they'd never touch).
  if (appContextService.getExperimentalFeatures().enableResolveDependencies !== true) {
    return { spaceIds, truncated };
  }

  // Walk the dependency closure: for each auto-installed dependency that would
  // also be removed, collect its affected spaces before any deletion starts.
  const dependencies = rootInstallation.dependencies ?? [];
  for (const dep of dependencies) {
    if (beingRemoved.has(dep.name)) {
      continue;
    }
    // Use failOnUnexpectedError so a transient read failure causes the preflight to
    // fail closed rather than silently skipping a dep that cleanup will still remove.
    const depSO = await getInstallationObject({
      savedObjectsClient,
      pkgName: dep.name,
      failOnUnexpectedError: true,
    });
    const depInstallation = depSO?.attributes;
    if (!depInstallation) {
      continue;
    }

    // A dependency is removed at runtime when all its dependants have been removed.
    // Use `beingRemoved` (the full set of packages removed in this closure) rather
    // than just the current root, so shared transitive deps (C depended on by both
    // A and B) are correctly identified as eventually-removed when A and B are both
    // in the closure — matching the sequential runtime behaviour of cleanupDependenciesStep.
    if (!depInstallation.installed_as_dependency) {
      continue;
    }
    const isDependencyOf = depInstallation.is_dependency_of ?? [];
    // Mirror cleanupDependenciesStep: deps with an empty is_dependency_of list are not
    // removed at runtime (the guard is `if (isDependencyOf.length > 0)`), so don't
    // include them in the pre-auth closure — [].every(...) would be vacuously true.
    if (isDependencyOf.length === 0) {
      continue;
    }
    const allDependantsBeingRemoved = isDependencyOf.every((p) => beingRemoved.has(p.name));
    if (!allDependantsBeingRemoved) {
      continue;
    }

    const internalSoClient = appContextService.getInternalUserSOClientWithoutSpaceExtension();
    const { total: depTotal, items: depPolicies } = await packagePolicyService.list(
      internalSoClient,
      {
        kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${dep.name}`,
        page: 1,
        perPage: SO_SEARCH_LIMIT,
        spaceId: '*',
      }
    );

    if (depPolicies.length < depTotal) {
      truncated = true;
    }

    addFromInstallationAndPolicies(depInstallation, depPolicies);
    beingRemoved.add(dep.name);

    // Recurse into transitive dependencies
    const nested = await collectSpacesForUninstallClosure(
      savedObjectsClient,
      depInstallation,
      depPolicies,
      beingRemoved
    );
    if (nested.truncated) {
      truncated = true;
    }
    for (const spaceId of nested.spaceIds) {
      spaceIds.add(spaceId);
    }
  }

  return { spaceIds, truncated };
}

export async function assertUninstallAuthorizedForAffectedSpaces({
  request,
  pkgName,
  installation,
  packagePolicies,
  savedObjectsClient,
  precomputedSpaceIds,
}: {
  request: KibanaRequest;
  pkgName: string;
  installation: Installation;
  packagePolicies: PackagePolicy[];
  savedObjectsClient: SavedObjectsClientContract;
  // When provided (bulk handler), skip closure collection and use this set directly.
  precomputedSpaceIds?: Set<string>;
}): Promise<void> {
  const security = appContextService.getSecurity();
  if (!security) {
    return;
  }
  if (!security.authz.mode.useRbacForRequest(request)) {
    return;
  }

  let spaceIdsArray: string[];

  if (precomputedSpaceIds) {
    spaceIdsArray = Array.from(precomputedSpaceIds);
  } else {
    // Collect all affected space IDs across the full dependency closure so that
    // a single authz check covers everything before any deletion begins.
    const { spaceIds, truncated } = await collectSpacesForUninstallClosure(
      savedObjectsClient,
      installation,
      packagePolicies
    );

    if (truncated) {
      throw new PackageRemovalError(
        `Unable to verify uninstall authorization for package ${pkgName}: too many package policies to enumerate`
      );
    }

    spaceIdsArray = Array.from(spaceIds);
  }

  await assertPrivilegesInSpaces({
    request,
    spaceIds: spaceIdsArray,
    apiPrivileges: ['integrations-all', 'fleet-agent-policies-all'],
    errorMessage: `Insufficient privileges to uninstall package ${pkgName}: it is used in spaces you are not authorized to access`,
  });
}

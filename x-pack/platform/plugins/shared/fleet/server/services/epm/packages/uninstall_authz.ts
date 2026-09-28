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
import { FleetUnauthorizedError, PackageRemovalError } from '../../../errors';
import { appContextService, packagePolicyService } from '../..';

import { getInstallation } from '.';

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
  visited: Set<string> = new Set()
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
  visited.add(rootInstallation.name);

  // Walk the dependency closure: for each auto-installed dependency that would
  // also be removed, collect its affected spaces before any deletion starts.
  const dependencies = rootInstallation.dependencies ?? [];
  for (const dep of dependencies) {
    if (visited.has(dep.name)) {
      continue;
    }
    const depInstallation = await getInstallation({ savedObjectsClient, pkgName: dep.name });
    if (!depInstallation) {
      continue;
    }

    // Only check deps that would actually be removed (same logic as cleanupDependenciesStep)
    const isDependencyOf = depInstallation.is_dependency_of ?? [];
    const remainingDependants = isDependencyOf.filter(
      (p) => !(p.name === rootInstallation.name && p.version === rootInstallation.version)
    );
    const wouldBeRemoved =
      remainingDependants.length === 0 && depInstallation.installed_as_dependency === true;
    if (!wouldBeRemoved) {
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
    visited.add(dep.name);

    // Recurse into transitive dependencies
    const nested = await collectSpacesForUninstallClosure(
      savedObjectsClient,
      depInstallation,
      depPolicies,
      visited
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
}: {
  request: KibanaRequest;
  pkgName: string;
  installation: Installation;
  packagePolicies: PackagePolicy[];
  savedObjectsClient: SavedObjectsClientContract;
}): Promise<void> {
  const security = appContextService.getSecurity();
  if (!security) {
    return;
  }

  if (!security.authz.mode.useRbacForRequest(request)) {
    return;
  }

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

  const spaceIdsArray = Array.from(spaceIds);

  const { authz } = security;
  const result = await authz.checkPrivilegesWithRequest(request).atSpaces(spaceIdsArray, {
    kibana: [
      authz.actions.api.get('integrations-all'),
      authz.actions.api.get('fleet-agent-policies-all'),
    ],
  });

  if (!result.hasAllRequested) {
    throw new FleetUnauthorizedError(
      `Insufficient privileges to uninstall package ${pkgName}: it is used in spaces you are not authorized to access`
    );
  }
}

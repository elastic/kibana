/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';

import type { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';

import { appContextService, licenseService, packagePolicyService } from '../../services';
import type {
  BulkRollbackPackagesRequestSchema,
  BulkUninstallPackagesRequestSchema,
  BulkUpgradePackagesRequestSchema,
  FleetRequestHandler,
  GetOneBulkOperationPackagesRequestSchema,
} from '../../types';

import type {
  BulkOperationPackagesResponse,
  GetOneBulkOperationPackagesResponse,
} from '../../../common/types';
import { getInstallationsByName } from '../../services/epm/packages/get';
import { FleetError, FleetUnauthorizedError } from '../../errors';
import {
  assertUninstallAuthorizedForAffectedSpaces,
  collectSpacesForUninstallClosure,
} from '../../services/epm/packages/uninstall_authz';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE, SO_SEARCH_LIMIT } from '../../constants';
import {
  scheduleBulkUninstall,
  scheduleBulkUpgrade,
  getBulkOperationTaskResults,
  scheduleBulkRollback,
} from '../../tasks/packages_bulk_operations';

async function validateInstalledPackages(
  savedObjectsClient: SavedObjectsClientContract,
  packages: Array<{ name: string }>,
  operation: string
) {
  const pkgNames = packages.map(({ name }) => name);
  const installations = await getInstallationsByName({ savedObjectsClient, pkgNames });

  const nonInstalledPackages = pkgNames.filter(
    (pkgName) => !installations.some((installation) => installation.name === pkgName)
  );
  if (nonInstalledPackages.length) {
    throw new FleetError(
      `Cannot ${operation} non-installed packages: ${nonInstalledPackages.join(', ')}`
    );
  }
}

function getTaskManagerStart() {
  const taskManagerStart = appContextService.getTaskManagerStart();
  if (!taskManagerStart) {
    throw new Error('Task manager not defined');
  }
  return taskManagerStart;
}

export const postBulkUpgradePackagesHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof BulkUpgradePackagesRequestSchema.body>
> = async (context, request, response) => {
  const fleetContext = await context.fleet;
  const savedObjectsClient = fleetContext.internalSoClient;
  const spaceId = fleetContext.spaceId;

  const taskManagerStart = getTaskManagerStart();
  await validateInstalledPackages(savedObjectsClient, request.body.packages, 'upgrade');

  const taskId = await scheduleBulkUpgrade(
    taskManagerStart,
    {
      spaceId,
      packages: request.body.packages,
      upgradePackagePolicies: request.body.upgrade_package_policies,
      force: request.body.force,
      prerelease: request.body.prerelease,
    },
    request
  );

  const body: BulkOperationPackagesResponse = {
    taskId,
  };
  return response.ok({ body });
};

export const postBulkUninstallPackagesHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof BulkUninstallPackagesRequestSchema.body>
> = async (context, request, response) => {
  const fleetContext = await context.fleet;
  const savedObjectsClient = fleetContext.internalSoClient;

  const taskManagerStart = getTaskManagerStart();
  await validateInstalledPackages(savedObjectsClient, request.body.packages, 'uninstall');

  // Pre-authorize: check that the caller has privileges in all spaces affected by each package
  const pkgNames = request.body.packages.map(({ name }) => name);
  const installations = await getInstallationsByName({ savedObjectsClient, pkgNames });
  const internalSoClient = appContextService.getInternalUserSOClientWithoutSpaceExtension();

  // Single query across all packages, then group by name to avoid N round-trips
  const allPoliciesKuery = installations
    .map((i) => `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${i.name}`)
    .join(' OR ');
  const { total: allPoliciesTotal, items: allPackagePolicies } = await packagePolicyService.list(
    internalSoClient,
    {
      kuery: allPoliciesKuery,
      page: 1,
      perPage: SO_SEARCH_LIMIT,
      spaceId: '*',
    }
  );

  // Fail closed if SO_SEARCH_LIMIT was reached — there may be policies in spaces
  // we haven't enumerated yet.
  if (allPackagePolicies.length < allPoliciesTotal) {
    throw new FleetUnauthorizedError(
      `Unable to verify uninstall authorization: too many package policies to enumerate`
    );
  }

  // Group policies by package name for per-package authz check
  const policiesByPkg = new Map<string, typeof allPackagePolicies>();
  for (const policy of allPackagePolicies) {
    const name = policy.package?.name;
    if (name) {
      const existing = policiesByPkg.get(name) ?? [];
      existing.push(policy);
      policiesByPkg.set(name, existing);
    }
  }

  // Build the combined dependency closure across ALL requested packages with a single
  // shared beingRemoved set. This ensures shared auto-installed deps (C depended on
  // by both requested packages A and B) are correctly identified as eventually-removed
  // and included in the authz check, even though each package is evaluated in sequence.
  const combinedBeingRemoved = new Set<string>();
  const combinedSpaceIds = new Set<string>();
  let closureTruncated = false;

  for (const installation of installations) {
    const { spaceIds, truncated } = await collectSpacesForUninstallClosure(
      savedObjectsClient,
      installation,
      policiesByPkg.get(installation.name) ?? [],
      combinedBeingRemoved
    );
    if (truncated) closureTruncated = true;
    for (const spaceId of spaceIds) combinedSpaceIds.add(spaceId);
  }

  if (closureTruncated) {
    throw new FleetUnauthorizedError(
      `Unable to verify uninstall authorization: too many package policies to enumerate`
    );
  }

  // Single authz check covering the combined closure of all requested packages.
  // assertUninstallAuthorizedForAffectedSpaces would recompute the closure per-package;
  // pass the first installation as a representative carrier and override its space set.
  if (installations.length > 0) {
    await assertUninstallAuthorizedForAffectedSpaces({
      request,
      pkgName: installations.map((i) => i.name).join(', '),
      installation: installations[0],
      packagePolicies: [],
      savedObjectsClient,
      precomputedSpaceIds: combinedSpaceIds,
    });
  }

  const taskId = await scheduleBulkUninstall(
    taskManagerStart,
    {
      packages: request.body.packages,
      force: request.body.force,
    },
    request
  );

  const body: BulkOperationPackagesResponse = {
    taskId,
  };
  return response.ok({ body });
};

export const getOneBulkOperationPackagesHandler: FleetRequestHandler<
  TypeOf<typeof GetOneBulkOperationPackagesRequestSchema.params>
> = async (context, request, response) => {
  const taskManagerStart = getTaskManagerStart();

  const results = await getBulkOperationTaskResults(taskManagerStart, request.params.taskId);
  const body: GetOneBulkOperationPackagesResponse = {
    status: results.status,
    error: results.error,
    results: results.results,
  };
  return response.ok({ body });
};

export const getPackagePolicyIdsForCurrentUser = async (
  request: KibanaRequest,
  packages: { name: string }[]
): Promise<{ [packageName: string]: string[] }> => {
  const soClient = appContextService.getInternalUserSOClient(request);

  const packagePolicyIdsByPackageName: { [packageName: string]: string[] } = {};
  for (const pkg of packages) {
    const packagePolicySORes = await packagePolicyService.getPackagePolicySavedObjects(soClient, {
      searchFields: ['package.name'],
      search: pkg.name,
      spaceIds: ['*'],
      fields: ['id', 'name'],
    });
    packagePolicyIdsByPackageName[pkg.name] = packagePolicySORes.saved_objects.map((so) => so.id);
  }
  return packagePolicyIdsByPackageName;
};

export const postBulkRollbackPackagesHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof BulkRollbackPackagesRequestSchema.body>
> = async (context, request, response) => {
  const fleetContext = await context.fleet;
  const savedObjectsClient = fleetContext.internalSoClient;
  const spaceId = fleetContext.spaceId;

  if (!licenseService.isEnterprise()) {
    throw new FleetUnauthorizedError('Rollback integration requires an enterprise license.');
  }

  const taskManagerStart = getTaskManagerStart();
  await validateInstalledPackages(savedObjectsClient, request.body.packages, 'rollback');

  const taskId = await scheduleBulkRollback(
    taskManagerStart,
    {
      packages: request.body.packages,
      spaceId,
      packagePolicyIdsForCurrentUser: await getPackagePolicyIdsForCurrentUser(
        request,
        request.body.packages
      ),
    },
    request
  );

  const body: BulkOperationPackagesResponse = {
    taskId,
  };
  return response.ok({ body });
};

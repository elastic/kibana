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

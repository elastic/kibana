/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';

import { appContextService } from '../../services';
import type {
  BulkUpgradePackagesRequestSchema,
  FleetRequestHandler,
  GetOneBulkUpgradePackagesRequestSchema,
} from '../../types';
import { HTTPAuthorizationHeader } from '../../../common/http_authorization_header';

import type {
  BulkUpgradePackagesResponse,
  GetOneBulkUpgradePackagesResponse,
} from '../../../common/types';
import {
  getBulkUpgradeTaskResults,
  scheduleBulkUpgrade,
} from '../../tasks/bulk_upgrade_packages_task';
import { getInstallationsByName } from '../../services/epm/packages/get';
import { FleetError } from '../../errors';

export const postBulkUpgradePackagesHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof BulkUpgradePackagesRequestSchema.body>
> = async (context, request, response) => {
  const fleetContext = await context.fleet;
  const savedObjectsClient = fleetContext.internalSoClient;
  const spaceId = fleetContext.spaceId;
  const user = appContextService.getSecurityCore().authc.getCurrentUser(request) || undefined;
  const authorizationHeader = HTTPAuthorizationHeader.parseFromRequest(request, user?.username);

  const taskManagerStart = appContextService.getTaskManagerStart();
  if (!taskManagerStart) {
    throw new Error('Task manager not defined');
  }
  const pkgNames = request.body.packages.map(({ name }) => name);
  const installations = await getInstallationsByName({ savedObjectsClient, pkgNames });

  const nonInstalledPackages = pkgNames.filter(
    (pkgName) => !installations.some((installation) => installation.name === pkgName)
  );
  if (nonInstalledPackages.length) {
    throw new FleetError(
      `Cannot upgrade non installed packages: ${nonInstalledPackages.join(', ')}`
    );
  }

  const taskId = await scheduleBulkUpgrade(taskManagerStart, savedObjectsClient, {
    authorizationHeader,
    spaceId,
    packages: request.body.packages,
    upgradePackagePolicies: request.body.upgrade_package_policies,
    force: request.body.force,
    prerelease: request.body.prerelease,
  });

  const body: BulkUpgradePackagesResponse = {
    taskId,
  };
  return response.ok({ body });
};

export const getOneBulkUpgradePackagesHandler: FleetRequestHandler<
  TypeOf<typeof GetOneBulkUpgradePackagesRequestSchema.params>
> = async (context, request, response) => {
  const taskManagerStart = appContextService.getTaskManagerStart();
  if (!taskManagerStart) {
    throw new Error('Task manager not defined');
  }

  const results = await getBulkUpgradeTaskResults(taskManagerStart, request.params.taskId);
  const body: GetOneBulkUpgradePackagesResponse = {
    status: results.status,
    error: results.error,
    results: results.results,
  };
  return response.ok({ body });
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';

import type { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import pMap from 'p-map';

import { appContextService, licenseService, packagePolicyService } from '../../services';
import type {
  BulkRollbackPackagesRequestSchema,
  BulkNamespaceCustomizationRequestSchema,
  BulkUninstallPackagesRequestSchema,
  BulkUpgradePackagesRequestSchema,
  FleetRequestHandler,
  GetOneBulkOperationPackagesRequestSchema,
} from '../../types';
import { updatePackage } from '../../services/epm/packages/update';
import { scheduleSyncNamespaceTemplatesTask } from '../../tasks/sync_namespace_templates_task';
import {
  getAllowedNamespacePrefixesForSpace,
  isNamespaceAllowedByPrefixes,
} from '../../services/spaces/policy_namespaces';

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

// Number of concurrent per-package namespace-customization updates in the bulk
// endpoint. Each one hits the Installation SO; kept small to avoid SO client contention.
const BULK_NAMESPACE_CUSTOMIZATION_CONCURRENCY = 5;

export const postBulkNamespaceCustomizationHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof BulkNamespaceCustomizationRequestSchema.body>
> = async (context, request, response) => {
  const fleetContext = await context.fleet;
  const savedObjectsClient = fleetContext.internalSoClient;
  const spaceId = savedObjectsClient.getCurrentNamespace() ?? DEFAULT_SPACE_ID;

  const { packages, enable = [], disable = [] } = request.body;

  const conflicts = enable.filter((ns) => disable.includes(ns));
  if (conflicts.length > 0) {
    throw new FleetError(
      `Namespaces must not appear in both enable and disable: ${conflicts.join(', ')}`
    );
  }

  const taskManagerStart = getTaskManagerStart();
  const allowedPrefixes = await getAllowedNamespacePrefixesForSpace(spaceId);

  const items = await pMap(
    packages,
    async (packageName) => {
      const installation = await getInstallationsByName({
        savedObjectsClient,
        pkgNames: [packageName],
      });
      if (installation.length === 0) {
        return {
          name: packageName,
          success: false,
          error: `Package ${packageName} is not installed`,
        };
      }

      const current = installation[0].namespace_customization_enabled_for ?? [];
      // Tracks the persisted state across the try block: starts at `current`, advances
      // to `newList` once `updatePackage` has committed. The catch handler returns this
      // so the response always reflects what's actually in the SO.
      let persistedList = current;

      try {
        const afterEnable = [...new Set([...current, ...enable])];
        const newList = afterEnable.filter((ns) => !disable.includes(ns));

        // Gate both added and removed namespaces on the current space's allowed_namespace_prefixes.
        const added = newList.filter((ns) => !current.includes(ns));
        const removed = current.filter((ns) => !newList.includes(ns));
        const changed = [...added, ...removed];
        const blocked = changed.filter((ns) => !isNamespaceAllowedByPrefixes(ns, allowedPrefixes));
        if (blocked.length > 0) {
          return {
            name: packageName,
            success: false,
            namespace_customization_enabled_for: current,
            error: `Cannot change namespace customization for: ${blocked.join(
              ', '
            )}. Allowed prefixes in this space: ${(allowedPrefixes ?? []).join(', ')}`,
          };
        }

        const { namespaceCustomizationDiff } = await updatePackage({
          savedObjectsClient,
          pkgName: packageName,
          namespace_customization_enabled_for: newList,
        });
        persistedList = newList;

        if (
          namespaceCustomizationDiff.addedNamespaces.length > 0 ||
          namespaceCustomizationDiff.removedNamespaces.length > 0
        ) {
          await scheduleSyncNamespaceTemplatesTask(taskManagerStart, {
            spaceId,
            packageName,
            addedNamespaces: namespaceCustomizationDiff.addedNamespaces,
            removedNamespaces: namespaceCustomizationDiff.removedNamespaces,
          });
        }

        return {
          name: packageName,
          success: true,
          namespace_customization_enabled_for: newList,
        };
      } catch (err) {
        return {
          name: packageName,
          success: false,
          namespace_customization_enabled_for: persistedList,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    },
    { concurrency: BULK_NAMESPACE_CUSTOMIZATION_CONCURRENCY }
  );

  return response.ok({ body: { items } });
};

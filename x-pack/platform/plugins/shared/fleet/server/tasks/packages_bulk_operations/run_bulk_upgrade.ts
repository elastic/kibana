/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type {
  ElasticsearchClient,
  KibanaRequest,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';

import { installPackage } from '../../services/epm/packages';
import { appContextService, packagePolicyService } from '../../services';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE, SO_SEARCH_LIMIT } from '../../constants';

import { scheduleBulkOperationTask, formatError } from './utils';

export interface BulkUpgradeTaskParams {
  type: 'bulk_upgrade';
  packages: Array<{ name: string; version?: string }>;
  spaceId?: string;
  force?: boolean;
  prerelease?: boolean;
  upgradePackagePolicies?: boolean;
}

interface BulkUpgradeTaskState {
  isDone?: boolean;
  error?: { message: string };
  results?: Array<
    | {
        success: true;
        name: string;
      }
    | { success: false; name: string; error: { message: string } }
  >;
  [k: string]: unknown;
}

export async function _runBulkUpgradeTask({
  abortController,
  taskParams,
  logger,
  request,
}: {
  taskParams: BulkUpgradeTaskParams;
  abortController: AbortController;
  logger: Logger;
  request: KibanaRequest;
}) {
  const {
    packages,
    spaceId = DEFAULT_SPACE_ID,
    force,
    prerelease,
    upgradePackagePolicies,
  } = taskParams;
  const esClient = appContextService.getInternalUserESClient();
  const savedObjectsClient = appContextService.getInternalUserSOClientForSpaceId(spaceId);

  const results: BulkUpgradeTaskState['results'] = [];

  for (const pkg of packages) {
    // Throw between package install if task is aborted
    if (abortController.signal.aborted) {
      throw new Error('Task was aborted');
    }
    try {
      const installResult = await installPackage({
        spaceId,
        request,
        installSource: 'registry', // Upgrade can only happens from the registry,
        esClient,
        savedObjectsClient,
        pkgkey: pkg?.version ? `${pkg.name}-${pkg.version}` : pkg.name,
        force,
        prerelease,
      });

      if (installResult.error) {
        throw installResult.error;
      }

      if (upgradePackagePolicies) {
        await bulkUpgradePackagePolicies({
          savedObjectsClient,
          esClient,
          pkgName: pkg.name,
        });
      }

      results.push({
        name: pkg.name,
        success: true,
      });
    } catch (error) {
      logger.error(`Upgrade of package: ${pkg.name} failed`, { error });
      results.push({
        name: pkg.name,
        success: false,
        error: formatError(error),
      });
    }
  }
  return results;
}

async function bulkUpgradePackagePolicies({
  savedObjectsClient,
  esClient,
  pkgName,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  pkgName: string;
}) {
  const policyIdsToUpgrade = await packagePolicyService.listIds(savedObjectsClient, {
    page: 1,
    perPage: SO_SEARCH_LIMIT,
    kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${pkgName}`,
  });

  if (policyIdsToUpgrade.items.length) {
    const upgradePackagePoliciesResults = await packagePolicyService.bulkUpgrade(
      savedObjectsClient,
      esClient,
      policyIdsToUpgrade.items
    );
    const errors = upgradePackagePoliciesResults
      .filter((result) => !result.success)
      .map((result) => `${result.statusCode}: ${result.body?.message ?? ''}`);
    if (errors.length) {
      throw new Error(`Package policies upgrade for ${pkgName} failed:\n${errors.join('\n')}`);
    }
  }
}

export async function scheduleBulkUpgrade(
  taskManagerStart: TaskManagerStartContract,
  taskParams: Omit<BulkUpgradeTaskParams, 'type'>,
  request: KibanaRequest
) {
  return scheduleBulkOperationTask(
    taskManagerStart,
    { ...taskParams, type: 'bulk_upgrade' },
    request
  );
}

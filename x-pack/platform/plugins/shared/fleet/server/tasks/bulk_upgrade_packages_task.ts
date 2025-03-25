/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';

import { HTTPAuthorizationHeader } from '../../common/http_authorization_header';
import { installPackage } from '../services/epm/packages';
import { appContextService, packagePolicyService } from '../services';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE, SO_SEARCH_LIMIT } from '../constants';

const TASK_TYPE = 'fleet:packages-bulk-operations';
const TASK_TITLE = 'Fleet packages bulk operations';
const TASK_TIMEOUT = '10m';

interface BulkUpgradeTaskParams {
  packages: Array<{ name: string; version?: string }>;
  spaceId?: string;
  authorizationHeader: HTTPAuthorizationHeader | null;
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

export function registerBulkUpgradePackagesTask(taskManager: TaskManagerSetupContract) {
  taskManager.registerTaskDefinitions({
    [TASK_TYPE]: {
      title: TASK_TITLE,
      timeout: TASK_TIMEOUT,
      createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
        const abortController = new AbortController();

        return {
          run: async () => {
            const logger = appContextService.getLogger();
            if (taskInstance.state.isDone) {
              return;
            }

            const taskParams = taskInstance.params as BulkUpgradeTaskParams;
            try {
              const results = await _runBulkUpgradeTask({ abortController, logger, taskParams });
              const state: BulkUpgradeTaskState = {
                isDone: true,
                results,
              };
              return {
                runAt: new Date(Date.now() + 60 * 60 * 1000),
                state,
              };
            } catch (error) {
              logger.error('Packages bulk upgrade failed', { error });
              return {
                runAt: new Date(Date.now() + 60 * 60 * 1000),
                state: {
                  isDone: true,
                  error: formatError(error),
                },
              };
            }
          },
          cancel: async () => {
            abortController.abort('task timed out');
          },
        };
      },
    },
  });
}

function formatError(err: Error) {
  return { message: err.message };
}

export async function _runBulkUpgradeTask({
  abortController,
  taskParams,
  logger,
}: {
  taskParams: BulkUpgradeTaskParams;
  abortController: AbortController;
  logger: Logger;
}) {
  const {
    packages,
    spaceId = DEFAULT_SPACE_ID,
    authorizationHeader,
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
        authorizationHeader: authorizationHeader
          ? new HTTPAuthorizationHeader(
              authorizationHeader.scheme,
              authorizationHeader.credentials,
              authorizationHeader.username
            )
          : undefined,
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
  savedObjectsClient: SavedObjectsClientContract,
  taskParams: BulkUpgradeTaskParams
) {
  const id = uuidv4();
  await taskManagerStart.ensureScheduled({
    id: `${TASK_TYPE}:${id}`,
    scope: ['fleet'],
    params: taskParams,
    taskType: TASK_TYPE,
    runAt: new Date(Date.now() + 3 * 1000),
    state: {},
  });

  return id;
}

export async function getBulkUpgradeTaskResults(
  taskManagerStart: TaskManagerStartContract,
  id: string
) {
  const task = await taskManagerStart.get(`${TASK_TYPE}:${id}`);
  const state: BulkUpgradeTaskState = task.state;
  const status = !state?.isDone
    ? 'pending'
    : state?.error || state?.results?.some((r) => !r.success)
    ? 'failed'
    : 'success';
  return {
    status,
    error: state.error,
    results: state.results,
  };
}

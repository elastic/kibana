/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { KibanaRequest, Logger } from '@kbn/core/server';

import { removeInstallation } from '../../services/epm/packages';
import { appContextService } from '../../services';

import {
  scheduleBulkOperationTask,
  formatError,
  type BulkPackageOperationsTaskState,
  type BulkPackageOperationsTaskParams,
} from './utils';

export interface BulkUninstallTaskParams extends BulkPackageOperationsTaskParams {
  type: 'bulk_uninstall';
  packages: Array<{ name: string; version: string }>;
  force?: boolean;
}

export async function _runBulkUninstallTask({
  abortController,
  taskParams,
  logger,
}: {
  taskParams: BulkUninstallTaskParams;
  abortController: AbortController;
  logger: Logger;
}) {
  const { packages, force } = taskParams;
  const esClient = appContextService.getInternalUserESClient();
  const savedObjectsClient = appContextService.getInternalUserSOClient();
  const results: BulkPackageOperationsTaskState['results'] = [];

  for (const pkg of packages) {
    // Throw between package uninstall if task is aborted
    if (abortController.signal.aborted) {
      throw new Error('Task was aborted');
    }
    try {
      await removeInstallation({
        savedObjectsClient,
        pkgName: pkg.name,
        pkgVersion: pkg.version,
        esClient,
        force,
      });

      results.push({
        name: pkg.name,
        success: true,
      });
    } catch (error) {
      logger.error(`Uninstalling package: ${pkg.name} failed`, { error });
      results.push({
        name: pkg.name,
        success: false,
        error: formatError(error),
      });
    }
  }
  return results;
}

export async function scheduleBulkUninstall(
  taskManagerStart: TaskManagerStartContract,
  taskParams: Omit<BulkUninstallTaskParams, 'type'>,
  request: KibanaRequest
) {
  return scheduleBulkOperationTask(
    taskManagerStart,
    { ...taskParams, type: 'bulk_uninstall' },
    request
  );
}

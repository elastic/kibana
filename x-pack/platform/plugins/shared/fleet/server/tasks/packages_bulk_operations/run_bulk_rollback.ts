/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { Logger } from '@kbn/core/server';

import type { RollbackPackageResponse } from '../../../common/types';

import { appContextService } from '../../services';

import { rollbackInstallation } from '../../services/epm/packages/rollback';

import { scheduleBulkOperationTask, formatError } from './utils';

export interface BulkRollbackTaskParams {
  type: 'bulk_rollback';
  packages: Array<{ name: string }>;
  spaceId?: string;
  packagePolicyIdsForCurrentUser: { [packageName: string]: string[] };
}

interface BulkRollbackTaskState {
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

export async function _runBulkRollbackTask({
  abortController,
  taskParams,
  logger,
}: {
  taskParams: BulkRollbackTaskParams;
  abortController: AbortController;
  logger: Logger;
}) {
  const { packages, spaceId = DEFAULT_SPACE_ID, packagePolicyIdsForCurrentUser } = taskParams;
  const esClient = appContextService.getInternalUserESClient();
  const results: BulkRollbackTaskState['results'] = [];

  for (const pkg of packages) {
    // Throw between package rollback if task is aborted
    if (abortController.signal.aborted) {
      throw new Error('Task was aborted');
    }
    try {
      const response: RollbackPackageResponse = await rollbackInstallation({
        esClient,
        currentUserPolicyIds: packagePolicyIdsForCurrentUser[pkg.name],
        pkgName: pkg.name,
        spaceId,
      });
      appContextService.getLogger().info(JSON.stringify(response));

      results.push({
        name: pkg.name,
        success: true,
      });
    } catch (error) {
      logger.error(`Rollback of package: ${pkg.name} failed`, { error });
      results.push({
        name: pkg.name,
        success: false,
        error: formatError(error),
      });
    }
  }
  return results;
}

export async function scheduleBulkRollback(
  taskManagerStart: TaskManagerStartContract,
  taskParams: Omit<BulkRollbackTaskParams, 'type'>
) {
  return scheduleBulkOperationTask(taskManagerStart, { ...taskParams, type: 'bulk_rollback' });
}

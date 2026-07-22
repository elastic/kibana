/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';

import { appContextService } from '../services';
import { getInstallation, syncIlmPolicy } from '../services/epm/packages';

const TASK_TYPE = 'fleet:sync_ilm_policy';

export interface SyncIlmPolicyTaskParams {
  spaceId: string;
  packageName: string;
  namespace: string;
}

export function registerSyncIlmPolicyTask(taskManagerSetup: TaskManagerSetupContract) {
  taskManagerSetup.registerTaskDefinitions({
    [TASK_TYPE]: {
      title: 'Fleet Sync ILM policy namespace component templates',
      timeout: '15m',
      maxAttempts: 3,
      createTaskRunner: ({ taskInstance, abortController }) => {
        const { spaceId, packageName, namespace } = taskInstance.params as SyncIlmPolicyTaskParams;
        return {
          async run() {
            const logger = appContextService.getLogger();

            const soClient = appContextService.getInternalUserSOClientForSpaceId(spaceId);
            const esClient = appContextService.getInternalUserESClient();

            // Read the desired ILM policy from the Installation SO at run time rather than
            // relying on the value captured when the task was scheduled. This makes the task
            // idempotent and order-independent: with a deterministic task id, concurrent edits
            // dedupe to a single task that always converges to the latest persisted state.
            const installation = await getInstallation({
              savedObjectsClient: soClient,
              pkgName: packageName,
            });
            const ilmPolicy =
              installation?.namespace_customization_settings?.[namespace]?.ilm_policy;

            logger.debug(
              `[syncIlmPolicyTask] Running for package ${packageName}, namespace ${namespace} in space ${spaceId}: ilmPolicy=${
                ilmPolicy ?? '(clear)'
              }`
            );

            try {
              await syncIlmPolicy({
                soClient,
                esClient,
                packageName,
                namespace,
                ilmPolicy,
                abortController,
              });
            } catch (err) {
              logger.error(
                `[syncIlmPolicyTask] Failed for package ${packageName}, namespace ${namespace} in space ${spaceId}: ${
                  err instanceof Error ? err.message : String(err)
                }`,
                { error: err }
              );
              throw err;
            }
          },
        };
      },
    },
  });
}

export async function scheduleSyncIlmPolicyTask(
  taskManagerStart: TaskManagerStartContract,
  params: SyncIlmPolicyTaskParams
) {
  const { spaceId, packageName, namespace } = params;
  // Deterministic id keyed by (spaceId, packageName, namespace) so repeated edits dedupe to a
  // single scheduled task instead of enqueuing independent tasks that could apply out of order.
  // The task reads the desired policy from the SO at run time, so the latest state always wins.
  await taskManagerStart.ensureScheduled({
    id: `${TASK_TYPE}:${spaceId}:${packageName}:${namespace}`,
    scope: ['fleet'],
    params,
    taskType: TASK_TYPE,
    runAt: new Date(Date.now() + 3 * 1000),
    state: {},
  });
}

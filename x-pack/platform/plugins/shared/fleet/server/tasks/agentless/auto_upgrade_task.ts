/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';

import { appContextService } from '../../services';
import { runAgentlessAutoUpgrade } from '../../services/agentless/auto_upgrade';
import { type FleetConfigType } from '../../config';

export const AGENTLESS_AUTO_UPGRADE_TASK_TYPE = 'fleet:agentless-auto-upgrade-task';
const TASK_TITLE = 'Fleet agentless auto upgrade Task';
const TASK_TIMEOUT = '30m';

const TASK_ID = `${AGENTLESS_AUTO_UPGRADE_TASK_TYPE}:1.0.0`;

export function isAgentlessAutoUpgradeEnabled(config?: FleetConfigType): boolean {
  return Boolean(
    appContextService.getCloud()?.isServerlessEnabled &&
      config?.agentless?.enabled &&
      config?.agentless?.autoUpgrade?.enabled &&
      config.agentless.autoUpgrade.packages.length > 0
  );
}

export function registerAgentlessAutoUpgradeTask(taskManager: TaskManagerSetupContract) {
  taskManager.registerTaskDefinitions({
    [AGENTLESS_AUTO_UPGRADE_TASK_TYPE]: {
      title: TASK_TITLE,
      timeout: TASK_TIMEOUT,
      maxAttempts: 1,
      createTaskRunner: ({
        signal,
      }: {
        taskInstance: ConcreteTaskInstance;
        signal: AbortSignal;
      }) => {
        const logger = appContextService.getLogger().get('agentless-auto-upgrade');

        return {
          run: async () => {
            const config = appContextService.getConfig();
            if (!isAgentlessAutoUpgradeEnabled(config) || !config?.agentless?.autoUpgrade) {
              logger.debug('Agentless auto upgrade is disabled, skipping');
              return;
            }

            const { dryRun, packages } = config.agentless.autoUpgrade;
            logger.info(
              `Starting agentless auto upgrade${dryRun ? ' (dry run)' : ''} for ${packages
                .map((pkg) => `${pkg.name}@${pkg.versionRange}`)
                .join(', ')}`
            );
            await runAgentlessAutoUpgrade({ config: { dryRun, packages }, logger, signal });
          },
          cancel: async () => {
            logger.debug('Fleet agentless auto upgrade timed out');
          },
        };
      },
    },
  });
}

export async function scheduleAgentlessAutoUpgradeTask(
  taskManager: TaskManagerStartContract,
  config: FleetConfigType
) {
  if (!isAgentlessAutoUpgradeEnabled(config)) {
    return;
  }
  try {
    await taskManager.ensureScheduled({
      id: TASK_ID,
      taskType: AGENTLESS_AUTO_UPGRADE_TASK_TYPE,
      schedule: {
        interval: config.agentless?.autoUpgrade?.interval ?? '1h',
      },
      state: {},
      params: {},
    });
  } catch (error) {
    appContextService.getLogger().error(`Error scheduling agentless auto upgrade task.`, { error });
  }
}

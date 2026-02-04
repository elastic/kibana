/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
} from '@kbn/task-manager-plugin/server';

import { appContextService } from '../../services';

import { TASK_TIMEOUT, TASK_TITLE, TASK_TYPE, type SetupTaskParams } from './utils';
import { runBackportPackagePolicyInputId } from './run_backport_package_policy_input_id';
import { runMigrateComponentTemplateILMs } from './run_migrate_component_template_ilms';
import { runUpgradePackageInstallVersion } from './run_upgrade_package_install_version';
import { runReinstallPackagesForGlobalAssetUpdate } from './run_reinstall_packages_for_global_asset_update';

/**
 * Register Fleet setup operations, migrations, ...
 */
export function registerSetupTasks(taskManager: TaskManagerSetupContract) {
  taskManager.registerTaskDefinitions({
    [TASK_TYPE]: {
      title: TASK_TITLE,
      timeout: TASK_TIMEOUT,
      maxAttempts: 3,
      createTaskRunner: ({
        taskInstance,
        abortController,
      }: {
        taskInstance: ConcreteTaskInstance;
        abortController: AbortController;
      }) => {
        const logger = appContextService.getLogger();

        return {
          run: async () => {
            logger.debug(`Starting setup operation: ${taskInstance.params.type}`);

            const taskParams = taskInstance.params as SetupTaskParams;
            try {
              if (taskParams.type === 'backportPackagePolicyInputId') {
                await runBackportPackagePolicyInputId({
                  abortController,
                  logger,
                });
              } else if (taskParams.type === 'migrateComponentTemplateILMs') {
                await runMigrateComponentTemplateILMs({
                  abortController,
                  logger,
                });
              } else if (taskParams.type === 'upgradePackageInstallVersion') {
                await runUpgradePackageInstallVersion({
                  abortController,
                  logger,
                });
              } else if (taskParams.type === 'reinstallPackagesForGlobalAssetUpdate') {
                await runReinstallPackagesForGlobalAssetUpdate({
                  abortController,
                  logger,
                });
              } else {
                throw new Error(`Unknown setup operation: ${taskParams.type}`);
              }
            } catch (error) {
              logger.error(`Fleet setup operation: ${taskParams.type} failed`, { error });
              throw error;
            }
          },
          cancel: async () => {
            logger.debug(`Fleet setup operations timed out: ${taskInstance.params.type}`);
          },
        };
      },
    },
  });
}

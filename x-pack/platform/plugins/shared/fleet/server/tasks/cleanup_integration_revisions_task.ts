/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { type CoreSetup, type Logger } from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import type { LoggerFactory, SavedObjectsClientContract } from '@kbn/core/server';
import { errors } from '@elastic/elasticsearch';

import { appContextService } from '../services';
import { PACKAGES_SAVED_OBJECT_TYPE, SO_SEARCH_LIMIT } from '../constants';
import { getPackagePolicySavedObjectType } from '../services/package_policy';

export const TYPE = 'fleet:cleanup-integration-revisions-task';
export const VERSION = '1.0.0';
const TITLE = 'Fleet Cleanup Integration Revisions Task';
const SCOPE = ['fleet'];
const DEFAULT_INTERVAL = '1h';
const TIMEOUT = '5m';
const DEFAULT_INTEGRATION_ROLLBACK_TTL = '7d';

interface CleanupIntegrationRevisionsTaskConfig {
  taskInterval?: string;
  integrationRollbackTTL?: string;
}

interface CleanupIntegrationRevisionsTaskSetupContract {
  core: CoreSetup;
  taskManager: TaskManagerSetupContract;
  logFactory: LoggerFactory;
  config: CleanupIntegrationRevisionsTaskConfig;
}

interface CleanupIntegrationRevisionsTaskStartContract {
  taskManager: TaskManagerStartContract;
}

export class CleanupIntegrationRevisionsTask {
  private logger: Logger;
  private wasStarted: boolean = false;
  private taskInterval: string;
  private integrationRollbackTTL: string;

  constructor(setupContract: CleanupIntegrationRevisionsTaskSetupContract) {
    const { taskManager, logFactory, config } = setupContract;
    this.logger = logFactory.get(this.taskId);
    this.taskInterval = config.taskInterval ?? DEFAULT_INTERVAL;
    this.integrationRollbackTTL = config.integrationRollbackTTL ?? DEFAULT_INTEGRATION_ROLLBACK_TTL;

    taskManager.registerTaskDefinitions({
      [TYPE]: {
        title: TITLE,
        timeout: TIMEOUT,
        createTaskRunner: ({
          taskInstance,
          abortController,
        }: {
          taskInstance: ConcreteTaskInstance;
          abortController: AbortController;
        }) => {
          return {
            run: async () => {
              return this.runTask(taskInstance, abortController);
            },
            cancel: async () => {},
          };
        },
      },
    });
  }

  public start = async ({ taskManager }: CleanupIntegrationRevisionsTaskStartContract) => {
    if (!taskManager) {
      this.logger.error('[CleanupIntegrationRevisionsTask] Missing required service during start');
      return;
    }

    this.wasStarted = true;
    this.logger.info(
      `[CleanupIntegrationRevisionsTask] Started with interval of [${this.taskInterval}]`
    );

    try {
      await taskManager.ensureScheduled({
        id: this.taskId,
        taskType: TYPE,
        scope: SCOPE,
        schedule: {
          interval: this.taskInterval,
        },
        state: {},
        params: { version: VERSION },
      });
    } catch (e) {
      this.logger.error(
        `Error scheduling task CleanupIntegrationRevisionsTask, error: ${e.message}`,
        e
      );
    }
  };

  private get taskId(): string {
    return `${TYPE}:${VERSION}`;
  }

  private endRun(msg: string = '') {
    this.logger.info(`[CleanupIntegrationRevisionsTask] runTask ended${msg ? ': ' + msg : ''}`);
  }

  public runTask = async (taskInstance: ConcreteTaskInstance, abortController: AbortController) => {
    if (!appContextService.getExperimentalFeatures().enablePackageRollback) {
      this.logger.debug(
        '[CleanupIntegrationRevisionsTask] Aborting runTask: integration rollback feature is disabled'
      );
      return;
    }
    if (!this.wasStarted) {
      this.logger.debug('[CleanupIntegrationRevisionsTask] runTask Aborted. Task not started yet');
      return;
    }
    // Check that this task is current
    if (taskInstance.id !== this.taskId) {
      this.logger.debug(
        `[CleanupIntegrationRevisionsTask] Outdated task version: Got [${taskInstance.id}] from task instance. Current version is [${this.taskId}]`
      );
      return getDeleteTaskRunResult();
    }

    this.logger.info(`[runTask()] started`);
    const internalSoClientWithoutSpaceExtension =
      appContextService.getInternalUserSOClientWithoutSpaceExtension();

    try {
      await this.cleanupOldIntegrationPolicyRevisions(internalSoClientWithoutSpaceExtension);
      this.throwIfAborted(abortController);
      await this.cleanupOldPackageVersions(internalSoClientWithoutSpaceExtension);

      this.endRun('success');
    } catch (err) {
      if (err instanceof errors.RequestAbortedError) {
        this.logger.warn(
          `[CleanupIntegrationRevisionsTask] request aborted due to timeout: ${err}`
        );
        this.endRun();
        return;
      }
      this.logger.error(`[CleanupIntegrationRevisionsTask] error: ${err}`);
      this.endRun('error');
    }
  };

  private async cleanupOldIntegrationPolicyRevisions(soClient: SavedObjectsClientContract) {
    const savedObjectType = await getPackagePolicySavedObjectType();

    const packagePolicyPreviousRevisions = await soClient.find({
      type: savedObjectType,
      page: 1,
      perPage: SO_SEARCH_LIMIT,
      filter: `${savedObjectType}.attributes.latest_revision:false AND ${savedObjectType}.attributes.created_at < now-${this.integrationRollbackTTL}`,
      fields: [`_id`],
      namespaces: ['*'],
    });

    const ids = packagePolicyPreviousRevisions.saved_objects.map((obj) => obj.id);

    if (ids.length === 0) {
      return;
    }

    const response = await soClient
      .bulkDelete(
        ids.map((id) => ({ id, type: savedObjectType })),
        {
          force: true, // need to delete through multiple space
        }
      )
      .catch((error) =>
        this.logger.error(
          `[CleanupIntegrationRevisionsTask] Error deleting previous versions: ${error}`
        )
      );
    this.logger.info(
      `[CleanupIntegrationRevisionsTask] Deleted previous versions of package policies: ${JSON.stringify(
        response
      )}`
    );
  }

  private async cleanupOldPackageVersions(soClient: SavedObjectsClientContract) {
    const packages = await soClient.find({
      type: PACKAGES_SAVED_OBJECT_TYPE,
      page: 1,
      perPage: SO_SEARCH_LIMIT,
      filter: `${PACKAGES_SAVED_OBJECT_TYPE}.attributes.previous_version:* AND ${PACKAGES_SAVED_OBJECT_TYPE}.attributes.install_started_at < now-${this.integrationRollbackTTL}`,
      fields: [`_id`],
      namespaces: ['*'],
    });

    const ids = packages.saved_objects.map((obj) => obj.id);

    if (ids.length === 0) {
      return;
    }

    await soClient
      .bulkUpdate(
        ids.map((id) => ({
          id,
          type: PACKAGES_SAVED_OBJECT_TYPE,
          attributes: {
            previous_version: null,
          },
        }))
      )
      .catch((error) =>
        this.logger.error(
          `[CleanupIntegrationRevisionsTask] Error resetting previous versions in packages: ${error}`
        )
      );
    this.logger.info(
      `[CleanupIntegrationRevisionsTask] Reset previous versions in packages: ${JSON.stringify(
        ids
      )}`
    );
  }

  private throwIfAborted(abortController: AbortController) {
    if (abortController.signal.aborted) {
      throw new Error('Task was aborted');
    }
  }
}

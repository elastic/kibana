/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  ElasticsearchClient,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import type { LoggerFactory } from '@kbn/core/server';
import { errors } from '@elastic/elasticsearch';

import { AGENTS_INDEX } from '../../common/constants';

import { appContextService, settingsService } from '../services';

export const TYPE = 'fleet:delete-unenrolled-agents-task';
export const VERSION = '1.0.1';
const TITLE = 'Fleet Delete Unenrolled Agents Task';
const SCOPE = ['fleet'];
const INTERVAL = '1h';
const TIMEOUT = '1m';

interface DeleteUnenrolledAgentsTaskSetupContract {
  core: CoreSetup;
  taskManager: TaskManagerSetupContract;
  logFactory: LoggerFactory;
}

interface DeleteUnenrolledAgentsTaskStartContract {
  taskManager: TaskManagerStartContract;
}

export class DeleteUnenrolledAgentsTask {
  private logger: Logger;
  private wasStarted: boolean = false;

  constructor(setupContract: DeleteUnenrolledAgentsTaskSetupContract) {
    const { core, taskManager, logFactory } = setupContract;
    this.logger = logFactory.get(this.taskId);

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
              return this.runTask({ taskInstance, core, abortController });
            },
            cancel: async () => {},
          };
        },
      },
    });
  }

  public start = async ({ taskManager }: DeleteUnenrolledAgentsTaskStartContract) => {
    if (!taskManager) {
      this.logger.error('[DeleteUnenrolledAgentsTask] Missing required service during start');
      return;
    }

    this.wasStarted = true;
    this.logger.info(`[DeleteUnenrolledAgentsTask] Started with interval of [${INTERVAL}]`);

    try {
      await taskManager.ensureScheduled({
        id: this.taskId,
        taskType: TYPE,
        scope: SCOPE,
        schedule: {
          interval: INTERVAL,
        },
        state: {},
        params: { version: VERSION },
      });
    } catch (e) {
      this.logger.error(`Error scheduling task DeleteUnenrolledAgentsTask, error: ${e.message}`, e);
    }
  };

  private get taskId(): string {
    return `${TYPE}:${VERSION}`;
  }

  private endRun(msg: string = '') {
    this.logger.debug(`[DeleteUnenrolledAgentsTask] runTask ended${msg ? ': ' + msg : ''}`);
  }

  public async deleteUnenrolledAgents({
    esClient,
    abortController,
  }: {
    esClient: ElasticsearchClient;
    abortController: AbortController;
  }) {
    this.logger.debug(`[DeleteUnenrolledAgentsTask] Fetching unenrolled agents`);

    const response = await esClient.deleteByQuery(
      {
        index: AGENTS_INDEX,
        query: {
          bool: {
            filter: [
              {
                term: {
                  active: false,
                },
              },
            ],
          },
        },
      },
      { signal: abortController.signal }
    );

    this.logger.debug(
      `[DeleteUnenrolledAgentsTask] Executed deletion of ${response.deleted} unenrolled agents`
    );
  }

  public async isDeleteUnenrolledAgentsEnabled(
    soClient: SavedObjectsClientContract
  ): Promise<boolean> {
    const settings = await settingsService.getSettingsOrUndefined(soClient);
    return settings?.delete_unenrolled_agents?.enabled ?? false;
  }

  public runTask = async ({
    taskInstance,
    core,
    abortController,
  }: {
    taskInstance: ConcreteTaskInstance;
    core: CoreSetup;
    abortController: AbortController;
  }) => {
    if (!this.wasStarted) {
      this.logger.debug('[DeleteUnenrolledAgentsTask] runTask Aborted. Task not started yet');
      return;
    }
    // Check that this task is current
    if (taskInstance.id !== this.taskId) {
      this.logger.debug(
        `[DeleteUnenrolledAgentsTask] Outdated task version: Got [${taskInstance.id}] from task instance. Current version is [${this.taskId}]`
      );
      return getDeleteTaskRunResult();
    }

    this.logger.debug(`[runTask()] started`);

    const [coreStart] = await core.getStartServices();
    const esClient = coreStart.elasticsearch.client.asInternalUser;
    const soClient = appContextService.getInternalUserSOClientWithoutSpaceExtension();

    try {
      if (!(await this.isDeleteUnenrolledAgentsEnabled(soClient))) {
        this.logger.debug(
          '[DeleteUnenrolledAgentsTask] Delete unenrolled agents flag is disabled, returning.'
        );
        this.endRun('Delete unenrolled agents is disabled');
        return;
      }
      await this.deleteUnenrolledAgents({ esClient, abortController });

      this.endRun('success');
    } catch (err) {
      if (err instanceof errors.RequestAbortedError) {
        this.logger.warn(`[DeleteUnenrolledAgentsTask] request aborted due to timeout: ${err}`);
        this.endRun();
        return;
      }
      this.logger.error(`[DeleteUnenrolledAgentsTask] error: ${err}`);
      this.endRun('error');
    }
  };
}

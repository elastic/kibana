/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type {
  CoreSetup,
  CoreStart,
  ISavedObjectsRepository,
  SavedObjectsBulkUpdateObject,
} from '@kbn/core/server';
import type { TaskManagerStartContract } from '..';
import type { TaskScheduling } from '../task_scheduling';
import type { TaskTypeDictionary } from '../task_type_dictionary';
import type { FetchResult } from '../task_store';
import { TASK_SO_NAME } from '../saved_objects';
import type { ConcreteTaskInstance, IntervalSchedule, RunResult, TaskUserScope } from '../task';
import type {
  UiamConvertParams,
  UiamConvertResponse,
  UiamConvertSuccessResult,
  UiamConvertFailedResult,
} from './types';
import type { LatestTaskStateSchema } from './task_state';
import { emptyState, stateSchemaByVersion } from './task_state';
import type { TaskManagerPluginsStart } from '../plugin';

export const PROVISION_UIAM_API_KEYS_FLAG = 'alerting.rules.provisionUiamApiKeys';

const TASK_ID = 'uiam_api_key_provisioning';
export const TASK_TYPE = `task_manager:${TASK_ID}`;

const SCHEDULE_INTERVAL: IntervalSchedule = { interval: '1h' };
const TASK_TIMEOUT = '5m';

const RUN_AT_BUFFER_MS = 30_000; // 30 seconds
/** When there are more tasks to convert, run again after this many ms (1m) to process the next batch. */
const RUN_AT_INTERVAL_MS = 60_000;

/** Max number of task docs to fetch per run (same as referenced alerting provisioning task). */
const FETCH_BATCH_SIZE = 500;

export const TAGS = ['task-manager', 'uiam-api-key-provisioning', 'background-task'];

export interface ApiKeyToConvert {
  taskId: string;
  apiKey: string;
}

export interface UiamKeyResult {
  taskId: string;
  uiamApiKey: string;
  uiamApiKeyId: string;
}

interface RegisterUiamApiKeyProvisioningTaskOpts {
  coreSetup: CoreSetup<TaskManagerPluginsStart, TaskManagerStartContract>;
  taskTypeDictionary: TaskTypeDictionary;
}

export class UiamApiKeyProvisioningTask {
  private readonly logger: Logger;
  private isTaskScheduled: boolean | undefined = undefined;

  constructor({ logger }: { logger: Logger }) {
    this.logger = logger;
  }

  register(opts: RegisterUiamApiKeyProvisioningTaskOpts): void {
    const { coreSetup, taskTypeDictionary } = opts;
    taskTypeDictionary.registerTaskDefinitions({
      [TASK_TYPE]: {
        title: 'UIAM API key provisioning for task manager tasks',
        timeout: TASK_TIMEOUT,
        stateSchemaByVersion,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            run: async () => this.runTask(taskInstance, coreSetup),
          };
        },
      },
    });
  }

  async start({
    core,
    taskScheduling,
    removeIfExists,
  }: {
    core: CoreStart;
    taskScheduling: TaskScheduling;
    removeIfExists: (id: string) => Promise<void>;
  }): Promise<void> {
    if (!taskScheduling) {
      this.logger.error(`Missing required task scheduling service during start of ${TASK_TYPE}`, {
        tags: TAGS,
      });
      return;
    }

    const applyFlag = async (enabled: boolean) => {
      if (enabled && this.isTaskScheduled !== true) {
        try {
          await taskScheduling.ensureScheduled({
            id: TASK_ID,
            taskType: TASK_TYPE,
            schedule: SCHEDULE_INTERVAL,
            state: emptyState,
            params: {},
          });
          this.isTaskScheduled = true;
          this.logger.info(
            `${PROVISION_UIAM_API_KEYS_FLAG} enabled - Task ${TASK_TYPE} scheduled`,
            { tags: TAGS }
          );
        } catch (e) {
          this.logger.error(
            `Error scheduling task ${TASK_TYPE}, received ${(e as Error).message}`,
            { tags: TAGS }
          );
        }
      } else if (!enabled && this.isTaskScheduled === true) {
        try {
          await removeIfExists(TASK_ID);
          this.isTaskScheduled = false;
          this.logger.info(`${PROVISION_UIAM_API_KEYS_FLAG} disabled - Task ${TASK_TYPE} removed`, {
            tags: TAGS,
          });
        } catch (e) {
          this.logger.error(`Error removing task ${TASK_TYPE}, received ${(e as Error).message}`, {
            tags: TAGS,
          });
        }
      }
    };

    core.featureFlags.getBooleanValue$(PROVISION_UIAM_API_KEYS_FLAG, false).subscribe((enabled) => {
      applyFlag(enabled).catch(() => {});
    });
  }

  private async runTask(
    taskInstance: ConcreteTaskInstance,
    coreSetup: CoreSetup<TaskManagerPluginsStart, TaskManagerStartContract>
  ): Promise<RunResult> {
    const [coreStart, , taskManager] = await coreSetup.getStartServices();
    const savedObjectsClient = coreStart.savedObjects.createInternalRepository([TASK_SO_NAME]);
    const state = (taskInstance.state ?? emptyState) as LatestTaskStateSchema;

    const { apiKeysToConvert, tasksById, hasMoreToUpdate } = await this.getApiKeysToConvert(
      taskManager
    );

    const converted = await this.convertApiKeys(apiKeysToConvert, coreStart);

    await this.updateTasks(tasksById, converted, savedObjectsClient);

    return {
      state: { runs: state.runs + 1 },
      ...(hasMoreToUpdate ? { runAt: new Date(Date.now() + RUN_AT_INTERVAL_MS) } : {}),
    };
  }

  async getApiKeysToConvert(taskManager: TaskManagerStartContract): Promise<{
    apiKeysToConvert: ApiKeyToConvert[];
    tasksById: Map<string, ConcreteTaskInstance>;
    hasMoreToUpdate: boolean;
  }> {
    const now = new Date();
    const runAtAfter = new Date(now.getTime() + RUN_AT_BUFFER_MS).toISOString();

    const query = {
      bool: {
        must_not: [{ term: { 'task.status': 'running' } }],
        must: [{ range: { 'task.runAt': { gt: runAtAfter } } }],
      },
    };

    let result: FetchResult;
    try {
      result = await taskManager.fetch({
        query,
        size: FETCH_BATCH_SIZE,
      });
    } catch (error) {
      this.logger.error(`Error getting API keys to convert: ${(error as Error).message}`, {
        error: { stack_trace: (error as Error).stack },
        tags: TAGS,
      });
      throw error;
    }

    const apiKeysToConvert: ApiKeyToConvert[] = [];
    const tasksById = new Map<string, ConcreteTaskInstance>();
    for (const doc of result.docs) {
      const task = doc as unknown as ConcreteTaskInstance;
      if (!task.apiKey) continue;
      if (task.uiamApiKey && task.userScope?.uiamApiKeyId) continue;
      apiKeysToConvert.push({ taskId: task.id, apiKey: task.apiKey });
      tasksById.set(task.id, task);
    }

    const hasMoreToUpdate = result.docs.length >= FETCH_BATCH_SIZE;
    return { apiKeysToConvert, tasksById, hasMoreToUpdate };
  }

  async convertApiKeys(
    apiKeysToConvert: ApiKeyToConvert[],
    coreStart: CoreStart
  ): Promise<UiamKeyResult[]> {
    if (apiKeysToConvert.length === 0) return [];

    const keys: UiamConvertParams['keys'] = apiKeysToConvert.map(({ apiKey }) => ({
      key: apiKey,
      type: 'elasticsearch',
    }));

    const uiam = coreStart.security?.authc?.apiKeys?.uiam as
      | { convert?: (params: UiamConvertParams) => Promise<UiamConvertResponse> }
      | null
      | undefined;

    let response: UiamConvertResponse;
    try {
      const convertFn = uiam?.convert;
      if (typeof convertFn !== 'function') {
        this.logger.debug('UIAM convert API not available, skipping conversion', { tags: TAGS });
        return [];
      }
      response = await convertFn({ keys });
    } catch (error) {
      this.logger.error(`Error converting API keys: ${(error as Error).message}`, {
        error: { stack_trace: (error as Error).stack },
        tags: TAGS,
      });
      throw error;
    }

    const results: UiamKeyResult[] = [];
    for (let i = 0; i < response.results.length && i < apiKeysToConvert.length; i++) {
      const item = response.results[i];
      const { taskId } = apiKeysToConvert[i];
      if (item.status === 'success') {
        const success = item as UiamConvertSuccessResult;
        const encodedKey = Buffer.from(`${success.id}:${success.key}`).toString('base64');
        results.push({
          taskId,
          uiamApiKey: encodedKey,
          uiamApiKeyId: success.id,
        });
      } else {
        const failed = item as UiamConvertFailedResult;
        this.logger.warn(`UIAM convert failed for task ${taskId}: ${failed.message}`, {
          tags: TAGS,
        });
      }
    }
    return results;
  }

  async updateTasks(
    tasksById: Map<string, ConcreteTaskInstance>,
    converted: UiamKeyResult[],
    savedObjectsClient: ISavedObjectsRepository
  ): Promise<void> {
    if (converted.length === 0) return;

    const updates: Array<
      SavedObjectsBulkUpdateObject<{ uiamApiKey: string; userScope: TaskUserScope }>
    > = converted.map((c) => {
      const task = tasksById.get(c.taskId);
      const existingUserScope: TaskUserScope = task?.userScope ?? {
        apiKeyId: '',
        apiKeyCreatedByUser: false,
      };
      const mergedUserScope: TaskUserScope = {
        ...existingUserScope,
        uiamApiKeyId: c.uiamApiKeyId,
      };
      return {
        type: TASK_SO_NAME,
        id: c.taskId,
        attributes: {
          uiamApiKey: c.uiamApiKey,
          userScope: mergedUserScope,
        },
        ...(task?.version ? { version: task.version } : {}),
        mergeAttributes: true,
      };
    });

    try {
      await savedObjectsClient.bulkUpdate(updates);
    } catch (error) {
      this.logger.error(
        `Error bulk updating tasks with UIAM API keys: ${(error as Error).message}`,
        {
          error: { stack_trace: (error as Error).stack },
          tags: TAGS,
        }
      );
      throw error;
    }
  }
}

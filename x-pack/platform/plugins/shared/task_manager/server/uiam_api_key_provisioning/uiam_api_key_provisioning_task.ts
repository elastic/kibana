/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, Logger } from '@kbn/core/server';
import type { CoreSetup, CoreStart, ISavedObjectsRepository } from '@kbn/core/server';
import type { TaskManagerStartContract } from '..';
import type { TaskScheduling } from '../task_scheduling';
import type { TaskTypeDictionary } from '../task_type_dictionary';
import type { FetchResult } from '../task_store';
import { TASK_SO_NAME } from '../saved_objects';
import { UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE } from './uiam_api_keys_provisioning_status_saved_object';
import type { ConcreteTaskInstance } from '../task';
import type { UiamConvertResponse, ApiKeyToConvert, UiamKeyResult } from './types';
import type { LatestTaskStateSchema } from './task_state';
import { emptyState, stateSchemaByVersion } from './task_state';
import type { TaskManagerPluginsStart } from '../plugin';
import {
  TASK_MANAGER_UIAM_PROVISIONING_RUN_EVENT,
  type TaskManagerUiamProvisioningRunEventData,
} from './event_based_telemetry';
import {
  FETCH_BATCH_SIZE,
  RUN_AT_BUFFER_MS,
  RUN_AT_INTERVAL_MS,
  SCHEDULE_INTERVAL,
  TAGS,
  TASK_TIMEOUT,
  TASK_TYPE,
  UIAM_PROVISIONING_TASK_TITLE,
} from './constants';
import { buildSuccessProvisioningRunTelemetry } from './lib/build_provisioning_run_telemetry';
import { buildUiamProvisioningFetchQuery } from './lib/deferred_non_running_tasks_query';
import { partitionFetchedTasksForUiamConversion } from './lib/partition_fetched_tasks_for_uiam_conversion';
import { mapUiamConvertResponseToKeyResults } from './lib/map_uiam_convert_response_to_key_results';
import { buildSavedObjectBulkUpdatesForUiamKeys } from './lib/build_saved_object_bulk_updates_for_uiam';
import { UiamProvisioningFeatureFlagScheduler } from './lib/uiam_provisioning_feature_flag_scheduler';
import {
  createUiamProvisioningTaskRunner,
  type UiamProvisioningRunTaskOutcome,
} from './lib/create_uiam_provisioning_task_runner';
import {
  createFailedConversionTaskProvisioningStatus,
  createSkippedTaskProvisioningStatus,
  createTaskProvisioningStatusFromBulkUpdateResult,
  writeTaskUiamProvisioningObservabilityStatus,
  type TaskUiamProvisioningStatusDoc,
} from './lib/task_uiam_provisioning_observability_status';

interface RegisterUiamApiKeyProvisioningTaskOpts {
  coreSetup: CoreSetup<TaskManagerPluginsStart, TaskManagerStartContract>;
  taskTypeDictionary: TaskTypeDictionary;
}

export class UiamApiKeyProvisioningTask {
  private readonly logger: Logger;
  private readonly analytics: AnalyticsServiceSetup;
  private readonly featureFlagScheduler: UiamProvisioningFeatureFlagScheduler;

  constructor({ logger, analytics }: { logger: Logger; analytics: AnalyticsServiceSetup }) {
    this.logger = logger;
    this.analytics = analytics;
    this.featureFlagScheduler = new UiamProvisioningFeatureFlagScheduler(logger);
  }

  register(opts: RegisterUiamApiKeyProvisioningTaskOpts): void {
    const { coreSetup, taskTypeDictionary } = opts;
    taskTypeDictionary.registerTaskDefinitions({
      [TASK_TYPE]: {
        title: UIAM_PROVISIONING_TASK_TITLE,
        timeout: TASK_TIMEOUT,
        stateSchemaByVersion,
        createTaskRunner: createUiamProvisioningTaskRunner(coreSetup, {
          runTask: (taskInstance, cs) => this.runTask(taskInstance, cs),
          reportProvisioningRunEvent: (telemetry) => this.reportProvisioningRunEvent(telemetry),
        }),
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
    this.featureFlagScheduler.start({
      core,
      taskScheduling,
      removeIfExists,
      schedule: SCHEDULE_INTERVAL,
    });
  }

  stop(): void {
    this.featureFlagScheduler.stop();
  }

  private async runTask(
    taskInstance: ConcreteTaskInstance,
    coreSetup: CoreSetup<TaskManagerPluginsStart, TaskManagerStartContract>
  ): Promise<UiamProvisioningRunTaskOutcome> {
    const [coreStart, , taskManager] = await coreSetup.getStartServices();
    const savedObjectsClient = coreStart.savedObjects.createInternalRepository([
      TASK_SO_NAME,
      UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
    ]);
    const state = (taskInstance.state ?? emptyState) as LatestTaskStateSchema;

    const { apiKeysToConvert, tasksById, hasMoreToUpdate, skippedInBatch, skippedTaskDetails } =
      await this.getApiKeysToConvert(taskManager);

    const { converted, failedConversions } = await this.convertApiKeys(apiKeysToConvert, coreStart);

    const bulkUpdateResults = await this.updateTasks(tasksById, converted, savedObjectsClient);

    const skipped = skippedTaskDetails.map((s) =>
      createSkippedTaskProvisioningStatus(s.taskId, s.message)
    );
    const failedConversionDocs = failedConversions.map((f) =>
      createFailedConversionTaskProvisioningStatus(f.taskId, f.message)
    );
    const completed: TaskUiamProvisioningStatusDoc[] = [];
    const failed: TaskUiamProvisioningStatusDoc[] = [];
    for (const so of bulkUpdateResults) {
      const doc = createTaskProvisioningStatusFromBulkUpdateResult(so);
      if (so.error) {
        failed.push(doc);
      } else {
        completed.push(doc);
      }
    }

    await writeTaskUiamProvisioningObservabilityStatus(savedObjectsClient, this.logger, {
      skipped,
      failedConversions: failedConversionDocs,
      completed,
      failed,
    });

    const nextRuns = state.runs + 1;
    const telemetry = buildSuccessProvisioningRunTelemetry({
      apiKeysToConvertCount: apiKeysToConvert.length,
      convertedCount: converted.length,
      skippedInBatch,
      hasMoreToUpdate,
      nextRunNumber: nextRuns,
    });

    return {
      state: { runs: nextRuns },
      ...(hasMoreToUpdate ? { runAt: new Date(Date.now() + RUN_AT_INTERVAL_MS) } : {}),
      telemetry,
    };
  }

  private reportProvisioningRunEvent(telemetry: TaskManagerUiamProvisioningRunEventData): void {
    try {
      this.analytics.reportEvent(TASK_MANAGER_UIAM_PROVISIONING_RUN_EVENT.eventType, telemetry);
    } catch (e) {
      this.logger.debug(`Failed to report UIAM provisioning run telemetry event: ${e}`);
    }
  }

  async getApiKeysToConvert(taskManager: TaskManagerStartContract): Promise<{
    apiKeysToConvert: ApiKeyToConvert[];
    tasksById: Map<string, ConcreteTaskInstance>;
    hasMoreToUpdate: boolean;
    skippedInBatch: number;
    skippedTaskDetails: Array<{ taskId: string; message: string }>;
  }> {
    const now = new Date();
    const runAtAfter = new Date(now.getTime() + RUN_AT_BUFFER_MS).toISOString();
    const query = buildUiamProvisioningFetchQuery(runAtAfter);

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

    return partitionFetchedTasksForUiamConversion(result.docs, FETCH_BATCH_SIZE);
  }

  async convertApiKeys(
    apiKeysToConvert: ApiKeyToConvert[],
    coreStart: CoreStart
  ): Promise<{
    converted: UiamKeyResult[];
    failedConversions: Array<{ taskId: string; message: string }>;
  }> {
    if (apiKeysToConvert.length === 0) {
      return { converted: [], failedConversions: [] };
    }

    const keyStrings = apiKeysToConvert.map(({ apiKey }) => apiKey);

    const uiam = coreStart.security?.authc?.apiKeys?.uiam as
      | { convert?: (keys: string[]) => Promise<UiamConvertResponse> }
      | null
      | undefined;

    let response: UiamConvertResponse;
    try {
      const convertFn = uiam?.convert;
      if (typeof convertFn !== 'function') {
        this.logger.debug('UIAM convert API not available, skipping conversion', { tags: TAGS });
        return { converted: [], failedConversions: [] };
      }
      response = await convertFn(keyStrings);
    } catch (error) {
      this.logger.error(`Error converting API keys: ${(error as Error).message}`, {
        error: { stack_trace: (error as Error).stack },
        tags: TAGS,
      });
      throw error;
    }

    return mapUiamConvertResponseToKeyResults(apiKeysToConvert, response, (taskId, message) => {
      this.logger.warn(`UIAM convert failed for task ${taskId}: ${message}`, { tags: TAGS });
    });
  }

  async updateTasks(
    tasksById: Map<string, ConcreteTaskInstance>,
    converted: UiamKeyResult[],
    savedObjectsClient: ISavedObjectsRepository
  ): Promise<Array<{ id: string; error?: { message?: string } }>> {
    if (converted.length === 0) {
      return [];
    }

    const updates = buildSavedObjectBulkUpdatesForUiamKeys(converted, tasksById);

    try {
      const bulkResponse = await savedObjectsClient.bulkUpdate(updates);
      return bulkResponse.saved_objects.map((so) => ({
        id: so.id,
        ...(so.error ? { error: { message: so.error.message } } : {}),
      }));
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

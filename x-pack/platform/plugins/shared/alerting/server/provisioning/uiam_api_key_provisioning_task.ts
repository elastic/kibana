/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subscription } from 'rxjs';
import type { Logger, CoreSetup, CoreStart } from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
  ConcreteTaskInstance,
} from '@kbn/task-manager-plugin/server';
import { RULE_SAVED_OBJECT_TYPE } from '../saved_objects';
import { bulkMarkApiKeysForInvalidation } from '../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation';
import {
  stateSchemaByVersion,
  emptyState,
  type LatestTaskStateSchema,
} from './uiam_api_key_provisioning_task_state';
import {
  createProvisioningRunContext,
  classifyRulesForUiamProvisioning,
  fetchFirstBatchOfRulesToConvert,
  getErrorMessage,
  getExcludeRulesFilter,
  buildRuleUpdatesForUiam,
  mapConvertResponseToResult,
  prepareProvisioningStatusWrite,
  statusDocsAndOrphanedKeysFromBulkUpdate,
  type ProvisioningStatusWritePayload,
} from './lib';
import type {
  ProvisioningRunContext,
  ProvisioningStatusDocs,
  ApiKeyToConvert,
  GetApiKeysToConvertResult,
  UiamApiKeyByRuleId,
  ConvertApiKeysResult,
} from './types';
import type { AlertingPluginsStart } from '../plugin';
import {
  PROVISION_UIAM_API_KEYS_FLAG,
  API_KEY_PROVISIONING_TASK_ID,
  API_KEY_PROVISIONING_TASK_TYPE,
  API_KEY_PROVISIONING_TASK_SCHEDULE,
  TASK_TIMEOUT,
  RESCHEDULE_DELAY_MS,
  TAGS,
} from './constants';

export class UiamApiKeyProvisioningTask {
  private readonly logger: Logger;
  private readonly isServerless: boolean;
  private isTaskScheduled: boolean | undefined = undefined;
  private featureFlagSubscription: Subscription | undefined;

  constructor({ logger, isServerless }: { logger: Logger; isServerless: boolean }) {
    this.logger = logger;
    this.isServerless = isServerless;
  }

  register({
    core,
    taskManager,
  }: {
    core: CoreSetup<AlertingPluginsStart>;
    taskManager: TaskManagerSetupContract;
  }) {
    if (!this.isServerless) {
      return;
    }
    if (!taskManager) {
      this.logger.error(
        `Missing required task manager service during registration of ${API_KEY_PROVISIONING_TASK_TYPE}`,
        { tags: TAGS }
      );
      return;
    }
    taskManager.registerTaskDefinitions({
      [API_KEY_PROVISIONING_TASK_TYPE]: {
        title: 'UIAM API key provisioning task',
        timeout: TASK_TIMEOUT,
        stateSchemaByVersion,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            run: async () => this.runTask(taskInstance, core),
            cancel: async () => {},
          };
        },
      },
    });
  }

  public start = async ({
    core,
    taskManager,
  }: {
    core: CoreStart;
    taskManager: TaskManagerStartContract;
  }) => {
    if (!this.isServerless) {
      return;
    }
    if (!taskManager) {
      this.logger.error(
        `Missing required task manager service during start of ${API_KEY_PROVISIONING_TASK_TYPE}`,
        { tags: TAGS }
      );
      return;
    }

    this.featureFlagSubscription = core.featureFlags
      .getBooleanValue$(PROVISION_UIAM_API_KEYS_FLAG, false)
      .subscribe((enabled: boolean) => {
        this.applyProvisioningFlag(enabled, taskManager).catch(() => {});
      });
  };

  public stop = () => {
    this.featureFlagSubscription?.unsubscribe();
    this.featureFlagSubscription = undefined;
  };

  private scheduleProvisioningTask = async (
    taskManager: TaskManagerStartContract
  ): Promise<void> => {
    await taskManager.ensureScheduled({
      id: API_KEY_PROVISIONING_TASK_ID,
      taskType: API_KEY_PROVISIONING_TASK_TYPE,
      schedule: API_KEY_PROVISIONING_TASK_SCHEDULE,
      state: emptyState,
      params: {},
    });
    this.isTaskScheduled = true;
    this.logger.info(
      `${PROVISION_UIAM_API_KEYS_FLAG} enabled - Task ${API_KEY_PROVISIONING_TASK_TYPE} scheduled`,
      { tags: TAGS }
    );
  };

  private unscheduleProvisioningTask = async (
    taskManager: TaskManagerStartContract
  ): Promise<void> => {
    await taskManager.removeIfExists(API_KEY_PROVISIONING_TASK_ID);
    this.isTaskScheduled = false;
    this.logger.info(
      `${PROVISION_UIAM_API_KEYS_FLAG} disabled - Task ${API_KEY_PROVISIONING_TASK_TYPE} removed`,
      { tags: TAGS }
    );
  };

  private applyProvisioningFlag = async (
    enabled: boolean,
    taskManager: TaskManagerStartContract
  ): Promise<void> => {
    if (enabled && this.isTaskScheduled !== true) {
      try {
        await this.scheduleProvisioningTask(taskManager);
      } catch (e) {
        this.logger.error(
          `Error scheduling task ${API_KEY_PROVISIONING_TASK_TYPE}, received ${getErrorMessage(e)}`,
          { tags: TAGS }
        );
      }
    } else if (!enabled && this.isTaskScheduled === true) {
      try {
        await this.unscheduleProvisioningTask(taskManager);
      } catch (e) {
        this.logger.error(
          `Error removing task ${API_KEY_PROVISIONING_TASK_TYPE}, received ${getErrorMessage(e)}`,
          { tags: TAGS }
        );
      }
    }
  };

  private runTask = async (
    taskInstance: ConcreteTaskInstance,
    core: CoreSetup<AlertingPluginsStart>
  ): Promise<{ state: LatestTaskStateSchema; runAt?: Date; error?: Error }> => {
    const state = (taskInstance.state ?? emptyState) as LatestTaskStateSchema;
    const context = await createProvisioningRunContext(core);

    const { apiKeysToConvert, provisioningStatusForSkippedRules, hasMoreToProvision } =
      await this.getApiKeysToConvert(context);

    const { rulesWithUiamApiKeys, provisioningStatusForFailedConversions } =
      await this.convertApiKeys(apiKeysToConvert, context);

    const { provisioningStatusForCompletedRules, provisioningStatusForFailedRules } =
      await this.updateRules(rulesWithUiamApiKeys, context);

    await this.updateProvisioningStatus(
      {
        skipped: provisioningStatusForSkippedRules,
        failedConversions: provisioningStatusForFailedConversions,
        completed: provisioningStatusForCompletedRules,
        failed: provisioningStatusForFailedRules,
      },
      context
    );

    const nextState = { runs: state.runs + 1 };
    if (hasMoreToProvision) {
      return {
        state: nextState,
        runAt: new Date(Date.now() + RESCHEDULE_DELAY_MS),
      };
    }
    return { state: nextState };
  };

  private getApiKeysToConvert = async (
    context: ProvisioningRunContext
  ): Promise<GetApiKeysToConvertResult> => {
    try {
      const excludeRulesFilter = await getExcludeRulesFilter(context.savedObjectsClient);
      const { rules, hasMore: hasMoreToProvision } = await fetchFirstBatchOfRulesToConvert(
        context.encryptedSavedObjectsClient,
        { excludeRulesFilter, ruleType: RULE_SAVED_OBJECT_TYPE }
      );

      const { provisioningStatusForSkippedRules, apiKeysToConvert } =
        classifyRulesForUiamProvisioning(rules);

      return {
        apiKeysToConvert,
        provisioningStatusForSkippedRules,
        hasMoreToProvision,
      };
    } catch (error) {
      this.logger.error(`Error getting API keys to convert: ${getErrorMessage(error)}`, {
        error: { stack_trace: error instanceof Error ? error.stack : undefined, tags: TAGS },
      });
      throw error;
    }
  };

  private convertApiKeys = async (
    apiKeysToConvert: Array<ApiKeyToConvert>,
    context: ProvisioningRunContext
  ): Promise<ConvertApiKeysResult> => {
    if (apiKeysToConvert.length === 0) {
      return {
        rulesWithUiamApiKeys: new Map(),
        provisioningStatusForFailedConversions: [],
      };
    }

    try {
      const keys = apiKeysToConvert.map(({ attributes }) => attributes.apiKey!);
      const convertResponse = await context.uiamConvert(keys);
      if (convertResponse === null) {
        throw new Error('License required for the UIAM convert API is not enabled');
      }

      if (convertResponse.results.length !== apiKeysToConvert.length) {
        throw new Error(
          'Number of converted API keys does not match the number of API keys to convert'
        );
      }

      const { rulesWithUiamApiKeys, provisioningStatusForFailedConversions } =
        mapConvertResponseToResult(apiKeysToConvert, convertResponse);

      return { rulesWithUiamApiKeys, provisioningStatusForFailedConversions };
    } catch (error) {
      this.logger.error(`Error converting API keys: ${getErrorMessage(error)}`, {
        error: { stack_trace: error instanceof Error ? error.stack : undefined, tags: TAGS },
      });
      throw error;
    }
  };

  private updateRules = async (
    rulesWithUiamApiKeys: Map<string, UiamApiKeyByRuleId>,
    context: ProvisioningRunContext
  ): Promise<{
    provisioningStatusForCompletedRules: Array<ProvisioningStatusDocs>;
    provisioningStatusForFailedRules: Array<ProvisioningStatusDocs>;
  }> => {
    const empty = {
      provisioningStatusForCompletedRules: [] as Array<ProvisioningStatusDocs>,
      provisioningStatusForFailedRules: [] as Array<ProvisioningStatusDocs>,
    };
    if (rulesWithUiamApiKeys.size === 0) {
      return empty;
    }
    const ruleUpdates = buildRuleUpdatesForUiam(Array.from(rulesWithUiamApiKeys.values()));
    try {
      const bulkRuleUpdateResponse = await context.unsafeSavedObjectsClient.bulkUpdate(ruleUpdates);

      const {
        provisioningStatusForCompletedRules,
        provisioningStatusForFailedRules,
        orphanedUiamApiKeys,
      } = statusDocsAndOrphanedKeysFromBulkUpdate(
        bulkRuleUpdateResponse.saved_objects,
        rulesWithUiamApiKeys
      );

      if (orphanedUiamApiKeys.length > 0) {
        await bulkMarkApiKeysForInvalidation(
          { apiKeys: orphanedUiamApiKeys },
          this.logger,
          context.savedObjectsClient
        );
      }

      return { provisioningStatusForCompletedRules, provisioningStatusForFailedRules };
    } catch (error) {
      this.logger.error(`Error bulk updating rules with UIAM API keys: ${getErrorMessage(error)}`, {
        error: { stack_trace: error instanceof Error ? error.stack : undefined, tags: TAGS },
      });
      const orphanedUiamApiKeys = Array.from(rulesWithUiamApiKeys.values(), (r) => r.uiamApiKey);
      await bulkMarkApiKeysForInvalidation(
        { apiKeys: orphanedUiamApiKeys },
        this.logger,
        context.savedObjectsClient
      );
      throw error;
    }
  };

  private updateProvisioningStatus = async (
    payload: ProvisioningStatusWritePayload,
    context: ProvisioningRunContext
  ): Promise<void> => {
    const { docs, counts } = prepareProvisioningStatusWrite(payload);
    if (docs.length === 0) {
      return;
    }
    try {
      await context.savedObjectsClient.bulkCreate(docs, { overwrite: true });
      this.logger.info(
        `Wrote provisioning status: ${counts.total} total (${counts.skipped} skipped, ${counts.failedConversions} failed conversions, ${counts.completed} completed, ${counts.failed} failed updates).`,
        { tags: TAGS }
      );
    } catch (e) {
      this.logger.error(`Error writing provisioning status: ${getErrorMessage(e)}`, {
        error: { stack_trace: e instanceof Error ? e.stack : undefined, tags: TAGS },
      });
    }
  };
}

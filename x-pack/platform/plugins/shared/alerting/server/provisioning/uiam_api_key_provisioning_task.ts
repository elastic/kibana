/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, CoreSetup, SavedObjectsClientContract, CoreStart } from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
  ConcreteTaskInstance,
  IntervalSchedule,
} from '@kbn/task-manager-plugin/server';
import type { ConvertUiamAPIKeysResponse } from '@kbn/core-security-server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-shared';
import type { RawRule } from '../types';
import {
  RULE_SAVED_OBJECT_TYPE,
  UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
  API_KEY_PENDING_INVALIDATION_TYPE,
} from '../saved_objects';
import { bulkMarkApiKeysForInvalidation } from '../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation';
import { UiamApiKeyProvisioningStatus } from '../saved_objects/schemas/raw_uiam_api_keys_provisioning_status';
import {
  stateSchemaByVersion,
  emptyState,
  type LatestTaskStateSchema,
} from './uiam_api_key_provisioning_task_state';
import { getExcludeRulesFilter } from './lib/get_exclude_rules_filter';
import {
  createFailedConversionStatus,
  createStatusFromBulkUpdateResult,
  classifyRuleForUiamProvisioning,
  getErrorMessage,
} from './lib/helpers';
import { buildRuleUpdatesForUiam } from './lib/build_rule_updates_for_uiam';
import type {
  ProvisioningStatusDocs,
  ApiKeyToConvert,
  GetApiKeysToConvertResult,
  UiamApiKeyByRuleId,
  ConvertApiKeysResult,
} from './types';
import type { AlertingPluginsStart } from '../plugin';

export interface ProvisioningRunContext {
  coreStart: CoreStart;
  plugins: AlertingPluginsStart;
  uiamConvert: (keys: string[]) => Promise<ConvertUiamAPIKeysResponse | null>;
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  unsafeSavedObjectsClient: SavedObjectsClientContract;
  savedObjectsClient: SavedObjectsClientContract;
}

export const createProvisioningRunContext = async (
  core: CoreSetup<AlertingPluginsStart>
): Promise<ProvisioningRunContext> => {
  const [coreStart, plugins] = await core.getStartServices();
  const uiamConvert = coreStart.security?.authc?.apiKeys?.uiam?.convert;
  if (typeof uiamConvert !== 'function') {
    throw new Error('UIAM convert API is not available');
  }
  const encryptedSavedObjectsClient = plugins.encryptedSavedObjects.getClient({
    includedHiddenTypes: [RULE_SAVED_OBJECT_TYPE],
  });
  const unsafeSavedObjectsClient = coreStart.savedObjects.getUnsafeInternalClient({
    includedHiddenTypes: [RULE_SAVED_OBJECT_TYPE],
  });
  const savedObjectsClient = coreStart.savedObjects.createInternalRepository([
    UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
    API_KEY_PENDING_INVALIDATION_TYPE,
  ]);
  return {
    coreStart,
    plugins,
    uiamConvert,
    encryptedSavedObjectsClient,
    unsafeSavedObjectsClient,
    savedObjectsClient,
  };
};

export const PROVISION_UIAM_API_KEYS_FLAG = 'alerting.rules.provisionUiamApiKeys';
export const API_KEY_PROVISIONING_TASK_SCHEDULE: IntervalSchedule = { interval: '1m' };
const TASK_TIMEOUT = '5m';
export const GET_RULES_BATCH_SIZE = 300;
/** Delay before the next run when more batches are pending (1 minute) */
const RESCHEDULE_DELAY_MS = 60000;

export const API_KEY_PROVISIONING_TASK_ID = 'api_key_provisioning';
export const API_KEY_PROVISIONING_TASK_TYPE = `alerting:${API_KEY_PROVISIONING_TASK_ID}`;

export const TAGS = ['serverless', 'alerting', 'uiam-api-key-provisioning', 'background-task'];

export class UiamApiKeyProvisioningTask {
  private readonly logger: Logger;
  private readonly isServerless: boolean;
  private isTaskScheduled: boolean | undefined = undefined;

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

    core.featureFlags.getBooleanValue$(PROVISION_UIAM_API_KEYS_FLAG, false).subscribe((enabled) => {
      this.applyProvisioningFlag(enabled, taskManager).catch(() => {});
    });
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

    const provisioningStatusFromUpdate = await this.updateRules(rulesWithUiamApiKeys, context);

    await this.updateProvisioningStatus(
      provisioningStatusForSkippedRules,
      provisioningStatusForFailedConversions,
      provisioningStatusFromUpdate,
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

  private updateProvisioningStatus = async (
    provisioningStatusForSkippedRules: Array<ProvisioningStatusDocs>,
    provisioningStatusForFailedConversions: Array<ProvisioningStatusDocs>,
    provisioningStatusFromUpdate: Array<ProvisioningStatusDocs>,
    context: ProvisioningRunContext
  ): Promise<void> => {
    const all = [
      ...provisioningStatusForSkippedRules,
      ...provisioningStatusForFailedConversions,
      ...provisioningStatusFromUpdate,
    ];
    if (all.length === 0) {
      return;
    }
    try {
      await context.savedObjectsClient.bulkCreate(all, { overwrite: true });
      const counts = {
        skipped: provisioningStatusForSkippedRules.length,
        failedConversions: provisioningStatusForFailedConversions.length,
        completed: provisioningStatusFromUpdate.filter(
          (doc) => doc.attributes.status === UiamApiKeyProvisioningStatus.COMPLETED
        ).length,
        failed: provisioningStatusFromUpdate.filter(
          (doc) => doc.attributes.status === UiamApiKeyProvisioningStatus.FAILED
        ).length,
      };
      this.logger.info(
        `Wrote provisioning status: ${counts.skipped} skipped rules, ${counts.failedConversions} failed conversions, ${counts.completed} completed and ${counts.failed} failed updates.`,
        { tags: TAGS }
      );
    } catch (e) {
      this.logger.error(`Error writing provisioning status: ${getErrorMessage(e)}`, {
        error: { stack_trace: e instanceof Error ? e.stack : undefined, tags: TAGS },
      });
    }
  };

  private getApiKeysToConvert = async (
    context: ProvisioningRunContext
  ): Promise<GetApiKeysToConvertResult> => {
    try {
      const excludeRulesFilter = await getExcludeRulesFilter(context.savedObjectsClient);
      const rulesFinder =
        await context.encryptedSavedObjectsClient.createPointInTimeFinderDecryptedAsInternalUser<RawRule>(
          {
            type: RULE_SAVED_OBJECT_TYPE,
            perPage: GET_RULES_BATCH_SIZE,
            namespaces: ['*'],
            ...(excludeRulesFilter ? { filter: excludeRulesFilter } : {}),
          }
        );

      const provisioningStatusForSkippedRules: Array<ProvisioningStatusDocs> = [];
      const apiKeysToConvert: Array<ApiKeyToConvert> = [];
      let hasMoreToProvision = false;

      try {
        const findIterator = rulesFinder.find();
        const firstBatch = await findIterator.next();
        if (!firstBatch.done && firstBatch.value?.saved_objects) {
          const response = firstBatch.value;
          hasMoreToProvision = response.total > response.saved_objects.length;
          for (const rule of response.saved_objects) {
            const result = classifyRuleForUiamProvisioning(rule);
            if (result.action === 'skip') {
              provisioningStatusForSkippedRules.push(result.status);
            } else {
              apiKeysToConvert.push(result.rule);
            }
          }
        }
      } finally {
        await rulesFinder.close();
      }

      this.logger.info(
        `Found ${apiKeysToConvert.length} API keys to convert. ${provisioningStatusForSkippedRules.length} rules skipped. Has more to provision: ${hasMoreToProvision}.`,
        { tags: TAGS }
      );

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
        rulesWithUiamApiKeys: [],
        provisioningStatusForFailedConversions: [],
      };
    }

    const keys = apiKeysToConvert.map(({ attributes }) => attributes.apiKey!);

    try {
      const convertResponse = await context.uiamConvert(keys);
      if (convertResponse === null) {
        throw new Error('License required for the UIAM convert API is not enabled');
      }

      if (convertResponse.results.length !== apiKeysToConvert.length) {
        throw new Error(
          'Number of converted API keys does not match the number of API keys to convert'
        );
      }

      const rulesWithUiamApiKeys: Array<UiamApiKeyByRuleId> = [];
      const provisioningStatusForFailedConversions: Array<ProvisioningStatusDocs> = [];

      for (let i = 0; i < convertResponse.results.length && i < apiKeysToConvert.length; i++) {
        const item = convertResponse.results[i];
        const { ruleId, attributes, version } = apiKeysToConvert[i];
        if (item.status === 'success') {
          rulesWithUiamApiKeys.push({
            ruleId,
            uiamApiKey: Buffer.from(`${item.id}:${item.key}`).toString('base64'),
            attributes,
            version,
          });
        } else if (item.status === 'failed') {
          provisioningStatusForFailedConversions.push(
            createFailedConversionStatus(
              ruleId,
              `Error generating UIAM API key for the rule with ID ${ruleId}: ${item.message}`
            )
          );
        }
      }

      this.logger.info(
        `Successfully converted ${rulesWithUiamApiKeys.length} API keys. ${provisioningStatusForFailedConversions.length} conversions failed.`,
        { tags: TAGS }
      );

      return { rulesWithUiamApiKeys, provisioningStatusForFailedConversions };
    } catch (error) {
      this.logger.error(`Error converting API keys: ${getErrorMessage(error)}`, {
        error: { stack_trace: error instanceof Error ? error.stack : undefined, tags: TAGS },
      });
      throw error;
    }
  };

  private updateRules = async (
    rulesWithUiamApiKeys: Array<UiamApiKeyByRuleId>,
    context: ProvisioningRunContext
  ): Promise<Array<ProvisioningStatusDocs>> => {
    if (rulesWithUiamApiKeys.length === 0) {
      return [];
    }
    const ruleUpdates = buildRuleUpdatesForUiam(rulesWithUiamApiKeys);
    try {
      const bulkRuleUpdateResponse = await context.unsafeSavedObjectsClient.bulkUpdate(ruleUpdates);

      const uiamApiKeyByRuleId = new Map(
        rulesWithUiamApiKeys.map((r) => [r.ruleId, r.uiamApiKey] as const)
      );
      const statusDocs: Array<ProvisioningStatusDocs> = [];
      const orphanedUiamApiKeys: string[] = [];

      for (const so of bulkRuleUpdateResponse.saved_objects) {
        statusDocs.push(createStatusFromBulkUpdateResult(so));
        if (so.error) {
          const uiamApiKey = uiamApiKeyByRuleId.get(so.id);
          if (uiamApiKey) {
            orphanedUiamApiKeys.push(uiamApiKey);
          }
        }
      }

      if (orphanedUiamApiKeys.length > 0) {
        await bulkMarkApiKeysForInvalidation(
          { apiKeys: orphanedUiamApiKeys },
          this.logger,
          context.savedObjectsClient
        );
      }

      return statusDocs;
    } catch (error) {
      this.logger.error(`Error bulk updating rules with UIAM API keys: ${getErrorMessage(error)}`, {
        error: { stack_trace: error instanceof Error ? error.stack : undefined, tags: TAGS },
      });
      const orphanedUiamApiKeys = rulesWithUiamApiKeys.map((r) => r.uiamApiKey);
      await bulkMarkApiKeysForInvalidation(
        { apiKeys: orphanedUiamApiKeys },
        this.logger,
        context.savedObjectsClient
      );
      throw error;
    }
  };
}

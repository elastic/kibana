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
} from '../saved_objects';
import { UiamApiKeyProvisioningStatus } from '../saved_objects/schemas/raw_uiam_api_keys_provisioning_status';
import {
  stateSchemaByVersion,
  emptyState,
  type LatestTaskStateSchema,
} from './uiam_api_key_provisioning_task_state';
import { getExcludeRulesFilter } from './lib/get_exclude_rules_filter';
import {
  createSkippedRuleStatus,
  createFailedConversionStatus,
  createStatusFromBulkUpdateResult,
} from './lib/provisioning_status_helpers';
import { buildRuleUpdatesForUiam } from './lib/build_rule_updates_for_uiam';
import type {
  ProvisioningStatusDocs,
  ApiKeyToConvert,
  GetApiKeysToConvertResult,
  UiamApiKeyByRuleId,
  ConvertApiKeysResult,
} from './types';
import type { AlertingPluginsStart } from '../plugin';

export const PROVISION_UIAM_API_KEYS_FLAG = 'alerting.rules.provisionUiamApiKeys';
export const API_KEY_PROVISIONING_TASK_TASK_SCHEDULE: IntervalSchedule = { interval: '1m' };
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

  private applyProvisioningFlag = async (
    enabled: boolean,
    taskManager: TaskManagerStartContract
  ): Promise<void> => {
    if (enabled && this.isTaskScheduled !== true) {
      try {
        await taskManager.ensureScheduled({
          id: API_KEY_PROVISIONING_TASK_ID,
          taskType: API_KEY_PROVISIONING_TASK_TYPE,
          schedule: API_KEY_PROVISIONING_TASK_TASK_SCHEDULE,
          state: emptyState,
          params: {},
        });
        this.isTaskScheduled = true;
        this.logger.info(
          `${PROVISION_UIAM_API_KEYS_FLAG} enabled - Task ${API_KEY_PROVISIONING_TASK_TYPE} scheduled`,
          { tags: TAGS }
        );
      } catch (e) {
        const message = e.message ?? String(e);
        this.logger.error(
          `Error scheduling task ${API_KEY_PROVISIONING_TASK_TYPE}, received ${message}`,
          { tags: TAGS }
        );
      }
    } else if (!enabled && this.isTaskScheduled === true) {
      try {
        await taskManager.removeIfExists(API_KEY_PROVISIONING_TASK_ID);
        this.isTaskScheduled = false;
        this.logger.info(
          `${PROVISION_UIAM_API_KEYS_FLAG} disabled - Task ${API_KEY_PROVISIONING_TASK_TYPE} removed`,
          { tags: TAGS }
        );
      } catch (e) {
        const message = e.message ?? String(e);
        this.logger.error(
          `Error removing task ${API_KEY_PROVISIONING_TASK_TYPE}, received ${message}`,
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
    ]);

    const { apiKeysToConvert, provisioningStatusForSkippedRules, hasMoreToProvision } =
      await this.getApiKeysToConvert(savedObjectsClient, encryptedSavedObjectsClient);

    const { rulesWithUiamApiKeys, provisioningStatusForFailedConversions } =
      await this.convertApiKeys(apiKeysToConvert, uiamConvert);

    const provisioningStatusFromUpdate = await this.updateRules(
      rulesWithUiamApiKeys,
      unsafeSavedObjectsClient
    );

    await this.updateProvisioningStatus(
      provisioningStatusForSkippedRules,
      provisioningStatusForFailedConversions,
      provisioningStatusFromUpdate,
      savedObjectsClient
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
    savedObjectsClient: SavedObjectsClientContract
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
      await savedObjectsClient.bulkCreate(all, { overwrite: true });
      const updateCompleted = provisioningStatusFromUpdate.filter(
        (doc) => doc.attributes.status === UiamApiKeyProvisioningStatus.COMPLETED
      ).length;
      const updateFailed = provisioningStatusFromUpdate.filter(
        (doc) => doc.attributes.status === UiamApiKeyProvisioningStatus.FAILED
      ).length;
      const skipped = provisioningStatusForSkippedRules.length;
      const failedConversions = provisioningStatusForFailedConversions.length;
      this.logger.info(
        `Wrote provisioning status: ${skipped} skipped rules, ${failedConversions} failed conversions, ${updateCompleted} completed and ${updateFailed} failed updates.`,
        { tags: TAGS }
      );
    } catch (e) {
      const message = e.message ?? String(e);
      this.logger.error(`Error writing provisioning status: ${message}`, {
        error: { stack_trace: e.stack, tags: TAGS },
      });
    }
  };

  private getApiKeysToConvert = async (
    savedObjectsClient: SavedObjectsClientContract,
    encryptedSavedObjectsClient: EncryptedSavedObjectsClient
  ): Promise<GetApiKeysToConvertResult> => {
    try {
      const excludeRulesFilter = await getExcludeRulesFilter(savedObjectsClient);
      const rulesFinder =
        await encryptedSavedObjectsClient.createPointInTimeFinderDecryptedAsInternalUser<RawRule>({
          type: RULE_SAVED_OBJECT_TYPE,
          perPage: GET_RULES_BATCH_SIZE,
          namespaces: ['*'],
          ...(excludeRulesFilter ? { filter: excludeRulesFilter } : {}),
        });

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
            const { id } = rule;
            const { apiKey, apiKeyCreatedByUser, uiamApiKey } = rule.attributes;

            if (!apiKey) {
              provisioningStatusForSkippedRules.push(
                createSkippedRuleStatus(id, 'The rule has no API key')
              );
              continue;
            }
            if (uiamApiKey) {
              // this may happen if provision status update fails after adding the UIAM API key
              provisioningStatusForSkippedRules.push(
                createSkippedRuleStatus(id, 'The rule already has a UIAM API key')
              );
              continue;
            }
            if (apiKeyCreatedByUser === true) {
              provisioningStatusForSkippedRules.push(
                createSkippedRuleStatus(id, 'The API key was created by the user')
              );
            } else {
              apiKeysToConvert.push({
                ruleId: id,
                attributes: rule.attributes,
                version: rule.version,
              });
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
      const message = error.message ?? String(error);
      this.logger.error(`Error getting API keys to convert: ${message}`, {
        error: { stack_trace: error.stack, tags: TAGS },
      });
      throw error;
    }
  };

  private convertApiKeys = async (
    apiKeysToConvert: Array<ApiKeyToConvert>,
    uiamConvert: (keys: string[]) => Promise<ConvertUiamAPIKeysResponse | null>
  ): Promise<ConvertApiKeysResult> => {
    if (apiKeysToConvert.length === 0) {
      return {
        rulesWithUiamApiKeys: [],
        provisioningStatusForFailedConversions: [],
      };
    }

    const keys = apiKeysToConvert.map(({ attributes }) => attributes.apiKey!);

    try {
      const convertResponse = await uiamConvert(keys);
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
      const message = error.message ?? String(error);
      this.logger.error(`Error converting API keys: ${message}`, {
        error: { stack_trace: error.stack, tags: TAGS },
      });
      throw error;
    }
  };

  private updateRules = async (
    rulesWithUiamApiKeys: Array<UiamApiKeyByRuleId>,
    unsafeSavedObjectsClient: SavedObjectsClientContract
  ): Promise<Array<ProvisioningStatusDocs>> => {
    if (rulesWithUiamApiKeys.length === 0) {
      return [];
    }
    const ruleUpdates = buildRuleUpdatesForUiam(rulesWithUiamApiKeys);
    try {
      const bulkRuleUpdateResponse = await unsafeSavedObjectsClient.bulkUpdate(ruleUpdates);
      return bulkRuleUpdateResponse.saved_objects.map(createStatusFromBulkUpdateResult);
    } catch (error) {
      const message = error.message ?? String(error);
      this.logger.error(`Error bulk updating rules with UIAM API keys: ${message}`, {
        error: { stack_trace: error.stack, tags: TAGS },
      });
      throw error;
    }
  };
}

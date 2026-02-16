/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Logger,
  CoreSetup,
  SavedObjectsBulkUpdateObject,
  SavedObjectsClientContract,
  CoreStart,
} from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
  ConcreteTaskInstance,
  IntervalSchedule,
} from '@kbn/task-manager-plugin/server';
import type { RawRule } from '../types';
import {
  RULE_SAVED_OBJECT_TYPE,
  UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
} from '../saved_objects';
import {
  UiamApiKeyProvisioningStatus,
  UiamApiKeyProvisioningEntityType,
} from '../saved_objects/schemas/raw_uiam_api_keys_provisioning_status';
import {
  stateSchemaByVersion,
  emptyState,
  type LatestTaskStateSchema,
} from './uiam_api_key_provisioning_task_state';
import {
  generateUiamKeysForRules,
  type UiamConvertParams,
  type UiamConvertResponse,
} from './generate_uiam_keys_for_rules';
import { getExcludeRulesFilter } from './lib/get_exclude_rules_filter';
import type {
  ProvisioningStatusDocs,
  ApiKeyToConvert,
  GetApiKeysToConvertResult,
  UiamApiKeyByRuleId,
  ConvertApiKeysResult,
} from './types';
import type { AlertingPluginsStart } from '../plugin';
import errorMap from 'zod/v3/locales/en';
import { theme } from '@kbn/expressions-plugin/common';

const PROVISION_UIAM_API_KEYS_FLAG = 'alerting.rules.provisionUiamApiKeys';
const API_KEY_PROVISIONING_TASK_TASK_SCHEDULE: IntervalSchedule = { interval: '1h' };
const RUN_AT_INTERVAL = 60000;
const TASK_TIMEOUT = '5m';
const GET_RULES_BATCH_SIZE = 500;

export const API_KEY_PROVISIONING_TASK_ID = 'api_key_provisioning';
export const API_KEY_PROVISIONING_TASK_TYPE = `alerting:${API_KEY_PROVISIONING_TASK_ID}`;

const TAGS = ['serverless', 'alerting', 'uiam_api_key_provisioning'];

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

    const applyFlag = async (enabled: boolean) => {
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
        } catch (e) {
          this.logger.error(
            `Error scheduling task ${API_KEY_PROVISIONING_TASK_TYPE}, received ${e.message}`,
            { tags: TAGS }
          );
        }
      } else if (!enabled && this.isTaskScheduled === true) {
        try {
          await taskManager.removeIfExists(API_KEY_PROVISIONING_TASK_ID);
          this.isTaskScheduled = false;
        } catch (e) {
          this.logger.error(
            `Error removing task ${API_KEY_PROVISIONING_TASK_TYPE}, received ${e.message}`,
            { tags: TAGS }
          );
        }
      }
    };

    core.featureFlags.getBooleanValue$(PROVISION_UIAM_API_KEYS_FLAG, false).subscribe((enabled) => {
      applyFlag(enabled).catch(() => {});
    });
  };

  private runTask = async (
    taskInstance: ConcreteTaskInstance,
    core: CoreSetup<AlertingPluginsStart>
  ): Promise<{ state: LatestTaskStateSchema; runAt?: Date; error?: Error }> => {
    const state = (taskInstance.state ?? emptyState) as LatestTaskStateSchema;

    const [coreStart] = await core.getStartServices();
    const savedObjectsClient = coreStart.savedObjects.createInternalRepository([
      RULE_SAVED_OBJECT_TYPE,
      UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
    ]);

    const { apiKeysToConvert, hasMoreToUpdate, provisioningStatusForSkippedRules } =
      await this.getApiKeysToConvert(savedObjectsClient);

    const { apiKeysByRuleId, provisioningStatusForFailedConversions } = await this.convertApiKeys(
      apiKeysToConvert,
      coreStart
    );

    const provisioningStatusFromUpdate = await this.updateRules(
      apiKeysByRuleId,
      savedObjectsClient
    );

    const provisioningStatus = [
      ...provisioningStatusForSkippedRules,
      ...provisioningStatusForFailedConversions,
      ...provisioningStatusFromUpdate,
    ];

    await this.updateProvisioningStatus(provisioningStatus, savedObjectsClient);

    return {
      state: { runs: state.runs + 1 },
      ...(hasMoreToUpdate ? { runAt: new Date(Date.now() + RUN_AT_INTERVAL) } : {}),
    };
  };

  private updateProvisioningStatus = async (
    provisioningStatus: Array<ProvisioningStatusDocs>,
    savedObjectsClient: SavedObjectsClientContract
  ): Promise<void> => {
    if (provisioningStatus.length === 0) {
      return;
    }
    try {
      await savedObjectsClient.bulkCreate(provisioningStatus, { overwrite: true });
    } catch (e) {
      this.logger.error(`Error writing provisioning status: ${e.message}`, { tags: TAGS });
    }
  };

  private getApiKeysToConvert = async (
    savedObjectsClient: SavedObjectsClientContract
  ): Promise<GetApiKeysToConvertResult> => {
    try {
      const excludeRulesFilter = await getExcludeRulesFilter(savedObjectsClient);
      const rulesResponse = await savedObjectsClient.find<RawRule>({
        type: RULE_SAVED_OBJECT_TYPE,
        perPage: GET_RULES_BATCH_SIZE,
        namespaces: ['*'],
        ...(excludeRulesFilter ? { filter: excludeRulesFilter } : {}),
      });
      const provisioningStatusForSkippedRules: Array<ProvisioningStatusDocs> = [];
      const apiKeysToConvert: Array<ApiKeyToConvert> = [];
      for (const rule of rulesResponse.saved_objects) {
        const {
          id,
          attributes: { apiKey, apiKeyCreatedByUser },
        } = rule;
        if (!apiKey) {
          provisioningStatusForSkippedRules.push({
            type: UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
            id,
            attributes: {
              '@timestamp': new Date().toISOString(),
              entityId: id,
              entityType: UiamApiKeyProvisioningEntityType.RULE,
              status: UiamApiKeyProvisioningStatus.SKIPPED,
              message: 'The rule has no API key',
            },
          });
          continue;
        }
        if (apiKeyCreatedByUser === true) {
          provisioningStatusForSkippedRules.push({
            type: UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
            id,
            attributes: {
              '@timestamp': new Date().toISOString(),
              entityId: id,
              entityType: UiamApiKeyProvisioningEntityType.RULE,
              status: UiamApiKeyProvisioningStatus.SKIPPED,
              message: 'The API key was created by the user',
            },
          });
        } else {
          apiKeysToConvert.push({ ruleId: id, apiKey });
        }
      }
      const hasMoreToUpdate = rulesResponse.total > rulesResponse.saved_objects.length;
      return {
        apiKeysToConvert,
        provisioningStatusForSkippedRules,
        hasMoreToUpdate,
      };
    } catch (error) {
      this.logger.error(`Error getting API keys to convert: ${error.message}`, {
        error: { stack_trace: error.stack, tags: TAGS },
      });
      throw error;
    }
  };

  private convertApiKeys = async (
    apiKeysToConvert: Array<ApiKeyToConvert>,
    coreStart: CoreStart
  ): Promise<ConvertApiKeysResult> => {
    const keys = apiKeysToConvert.map(({ apiKey }) => ({
      key: apiKey,
      type: 'elasticsearch' as const,
    }));

    try {
      const uiam = coreStart.security?.authc?.apiKeys?.uiam as
        | { convert?: (params: UiamConvertParams) => Promise<UiamConvertResponse> }
        | null
        | undefined;
      const uiamConvert = uiam?.convert;
      const convertResponse: UiamConvertResponse =
        typeof uiamConvert === 'function'
          ? await uiamConvert({ keys })
          : await generateUiamKeysForRules({ keys });

      const apiKeysByRuleId: Array<UiamApiKeyByRuleId> = [];
      const provisioningStatusForFailedConversions: Array<ProvisioningStatusDocs> = [];

      for (let i = 0; i < convertResponse.results.length && i < apiKeysToConvert.length; i++) {
        const item = convertResponse.results[i];
        const { ruleId } = apiKeysToConvert[i];
        if (item.status === 'success') {
          apiKeysByRuleId.push({ ruleId, uiamApiKey: item.key });
        } else if (item.status === 'failed') {
          provisioningStatusForFailedConversions.push({
            type: UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
            id: ruleId,
            attributes: {
              '@timestamp': new Date().toISOString(),
              entityId: ruleId,
              entityType: UiamApiKeyProvisioningEntityType.RULE,
              status: UiamApiKeyProvisioningStatus.FAILED,
              message: `Error generating UIAM API key for the rule with ID ${ruleId}: ${item.message}`,
            },
          });
        }
      }

      return { apiKeysByRuleId, provisioningStatusForFailedConversions };
    } catch (error) {
      this.logger.error(`Error converting API keys: ${error.message}`, {
        error: { stack_trace: error.stack, tags: TAGS },
      });
      throw error;
    }
  };

  private updateRules = async (
    apiKeysByRuleId: Array<UiamApiKeyByRuleId>,
    savedObjectsClient: SavedObjectsClientContract
  ): Promise<Array<ProvisioningStatusDocs>> => {
    if (apiKeysByRuleId.length === 0) {
      return [];
    }
    const ruleUpdates: Array<SavedObjectsBulkUpdateObject<RawRule>> = apiKeysByRuleId.map(
      ({ ruleId, uiamApiKey }) => ({
        type: RULE_SAVED_OBJECT_TYPE,
        id: ruleId,
        attributes: { uiamApiKey } as Partial<RawRule>,
        // TODO DO we need to add the namespace here?
      })
    );
    try {
      const bulkRuleUpdateResponse = await savedObjectsClient.bulkUpdate(ruleUpdates);
      return bulkRuleUpdateResponse.saved_objects.map((so) => ({
        type: UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
        id: so.id,
        attributes: {
          '@timestamp': new Date().toISOString(),
          entityId: so.id,
          entityType: UiamApiKeyProvisioningEntityType.RULE,
          status: so.error
            ? UiamApiKeyProvisioningStatus.FAILED
            : UiamApiKeyProvisioningStatus.COMPLETED,
          ...(so.error
            ? { message: `Error bulk updating the rule with ID ${so.id}: ${so.error.message}` }
            : {}),
        },
      }));
    } catch (error) {
      this.logger.error(`Error bulk updating rules with UIAM API keys: ${error.message}`, {
        error: { stack_trace: error.stack, tags: TAGS },
      });
      throw error;
    }
  };
}

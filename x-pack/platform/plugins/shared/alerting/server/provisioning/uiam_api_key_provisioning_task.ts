/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Logger,
  CoreSetup,
  SavedObject,
  SavedObjectsBulkUpdateObject,
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
import type { AlertingPluginsStart } from '../plugin';

const PROVISION_UIAM_API_KEYS_FLAG = 'alerting.rules.provisionUiamApiKeys';
const API_KEY_PROVISIONING_TASK_TASK_SCHEDULE: IntervalSchedule = { interval: '1h' };
const RUN_AT_INTERVAL = 60000;
const TASK_TIMEOUT = '5m';
const GET_RULES_BATCH_SIZE = 500;

export const API_KEY_PROVISIONING_TASK_ID = 'api_key_provisioning';
export const API_KEY_PROVISIONING_TASK_TYPE = `alerting:${API_KEY_PROVISIONING_TASK_ID}`;

const TAGS = ['serverless', 'alerting', 'uiam_api_key_provisioning'];

interface ProvisioningStatusDocs {
  type: typeof UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE;
  id: string;
  attributes: {
    '@timestamp': string;
    entityId: string;
    entityType: string;
    status: string;
    message?: string;
  };
}

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
  ): Promise<{ state: LatestTaskStateSchema; runAt?: Date }> => {
    const state = (taskInstance.state ?? emptyState) as LatestTaskStateSchema;

    const [coreStart] = await core.getStartServices();
    const savedObjectsClient = coreStart.savedObjects.createInternalRepository([
      RULE_SAVED_OBJECT_TYPE,
      UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
    ]);

    const excludeRulesFilter = await getExcludeRulesFilter(savedObjectsClient);

    const rulesResponse = await savedObjectsClient.find<RawRule>({
      type: RULE_SAVED_OBJECT_TYPE,
      perPage: GET_RULES_BATCH_SIZE,
      namespaces: ['*'],
      ...(excludeRulesFilter ? { filter: excludeRulesFilter } : {}),
    });

    const now = new Date().toISOString();
    const provisioningStatusDocs: Array<ProvisioningStatusDocs> = [];
    const rulesToConvert: Array<SavedObject<RawRule>> = [];
    const convertParams: UiamConvertParams = { keys: [] };

    for (const rule of rulesResponse.saved_objects) {
      const {
        id,
        attributes: { apiKey, apiKeyCreatedByUser },
      } = rule;
      if (!apiKey) {
        provisioningStatusDocs.push({
          type: UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
          id,
          attributes: {
            '@timestamp': now,
            entityId: id,
            entityType: UiamApiKeyProvisioningEntityType.RULE,
            status: UiamApiKeyProvisioningStatus.SKIPPED,
            message: 'The rule has no API key',
          },
        });
        continue;
      }
      if (apiKeyCreatedByUser === true) {
        provisioningStatusDocs.push({
          type: UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
          id,
          attributes: {
            '@timestamp': now,
            entityId: id,
            entityType: UiamApiKeyProvisioningEntityType.RULE,
            status: UiamApiKeyProvisioningStatus.SKIPPED,
            message: 'The API key was created by the user',
          },
        });
      } else {
        rulesToConvert.push(rule);
        convertParams.keys.push({
          key: apiKey,
          type: 'elasticsearch',
        });
      }
    }

    const uiam = coreStart.security?.authc?.apiKeys?.uiam as
      | { convert?: (params: UiamConvertParams) => Promise<UiamConvertResponse> }
      | null
      | undefined;
    const uiamConvert = uiam?.convert;
    const convertResponse: UiamConvertResponse =
      typeof uiamConvert === 'function'
        ? await uiamConvert(convertParams)
        : await generateUiamKeysForRules(convertParams);

    const ruleUpdates: Array<SavedObjectsBulkUpdateObject<RawRule>> = [];

    for (let i = 0; i < convertResponse.results.length && i < rulesToConvert.length; i++) {
      const item = convertResponse.results[i];
      const rule = rulesToConvert[i];
      const ruleId = rule.id;
      if (item.status === 'success') {
        ruleUpdates.push({
          type: RULE_SAVED_OBJECT_TYPE,
          id: ruleId,
          attributes: {
            uiamApiKey: item.key,
          } as Partial<RawRule>,
          ...(rule.namespaces?.[0] ? { namespace: rule.namespaces[0] } : {}),
        });
      } else if (item.status === 'failed') {
        provisioningStatusDocs.push({
          type: UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
          id: ruleId,
          attributes: {
            '@timestamp': now,
            entityId: ruleId,
            entityType: UiamApiKeyProvisioningEntityType.RULE,
            status: UiamApiKeyProvisioningStatus.FAILED,
            message: `Error generating UIAM API key for the rule with ID ${ruleId}: ${item.message}`,
          },
        });
      }
    }

    if (ruleUpdates.length > 0) {
      try {
        const bulkRuleUpdateResponse = await savedObjectsClient.bulkUpdate(ruleUpdates);
        for (const so of bulkRuleUpdateResponse.saved_objects) {
          provisioningStatusDocs.push({
            type: UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
            id: so.id,
            attributes: {
              '@timestamp': now,
              entityId: so.id,
              entityType: UiamApiKeyProvisioningEntityType.RULE,
              status: so.error
                ? UiamApiKeyProvisioningStatus.FAILED
                : UiamApiKeyProvisioningStatus.COMPLETED,
              ...(so.error
                ? { message: `Error bulk updating the rule with ID ${so.id}: ${so.error.message}` }
                : {}),
            },
          });
        }
      } catch (error) {
        this.logger.error(`Error bulk updating rules with UIAM API keys: ${error.message}`, {
          tags: TAGS,
        });
      }
    }

    if (provisioningStatusDocs.length > 0) {
      try {
        await savedObjectsClient.bulkCreate(provisioningStatusDocs, { overwrite: true });
      } catch (e) {
        this.logger.error(`Error writing provisioning status: ${e.message}`, { tags: TAGS });
      }
    }

    const hasMoreToConvert = rulesResponse.total > rulesResponse.saved_objects.length;

    return {
      state: { runs: state.runs + 1 },
      ...(hasMoreToConvert ? { runAt: new Date(Date.now() + RUN_AT_INTERVAL) } : {}),
    };
  };
}

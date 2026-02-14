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
import { nodeBuilder, nodeTypes } from '@kbn/es-query';
import type { RawRule } from '../types';
import {
  RULE_SAVED_OBJECT_TYPE,
  UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
} from '../saved_objects';
import {
  UiamApiKeyProvisioningStatus,
  UiamApiKeyProvisioningEntityType,
} from '../saved_objects/schemas/raw_uiam_api_keys_provisioning_status';
import { convertRuleIdsToKueryNode } from '../lib/convert_rule_ids_to_kuery_node';
import {
  stateSchemaByVersion,
  emptyState,
  type LatestTaskStateSchema,
} from './uiam_api_key_provisioning_task_state';
import { generateUiamKeysForRules } from './generate_uiam_keys_for_rules';
import type { AlertingPluginsStart } from '../plugin';

const PROVISION_UIAM_API_KEYS_FLAG = 'alerting.rules.provisionUiamApiKeys';
const API_KEY_PROVISIONING_TASK_TASK_SCHEDULE: IntervalSchedule = { interval: '1h' };
const RUN_AT_INTERVAL = 60000;

export const API_KEY_PROVISIONING_TASK_ID = 'api_key_provisioning';
export const API_KEY_PROVISIONING_TASK_TYPE = `alerting:${API_KEY_PROVISIONING_TASK_ID}`;

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
        `Missing required task manager service during registration of ${API_KEY_PROVISIONING_TASK_TYPE}`
      );
      return;
    }
    taskManager.registerTaskDefinitions({
      [API_KEY_PROVISIONING_TASK_TYPE]: {
        title: 'API key migration task',
        timeout: '1m',
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
        `Missing required task manager service during start of ${API_KEY_PROVISIONING_TASK_TYPE}`
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
            `Error scheduling task ${API_KEY_PROVISIONING_TASK_TYPE}, received ${e.message}`
          );
        }
      } else if (!enabled && this.isTaskScheduled === true) {
        try {
          await taskManager.removeIfExists(API_KEY_PROVISIONING_TASK_ID);
          this.isTaskScheduled = false;
        } catch (e) {
          this.logger.error(
            `Error removing task ${API_KEY_PROVISIONING_TASK_TYPE}, received ${e.message}`
          );
        }
      }
    };

    core.featureFlags.getBooleanValue$(PROVISION_UIAM_API_KEYS_FLAG, false).subscribe((enabled) => {
      applyFlag(enabled).catch(() => {});
    });
  };

  /**
   * Fetches all rule IDs that have status 'completed' or 'skipped' in the
   * UIAM API keys provisioning status saved objects (so we exclude them from provisioning).
   */
  private getCompletedOrSkippedRuleIds = async (
    savedObjectsClient: SavedObjectsClientContract
  ): Promise<Set<string>> => {
    const statusAttr = `${UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE}.attributes`;
    const filter = nodeBuilder.and([
      nodeBuilder.or([
        nodeBuilder.is(`${statusAttr}.status`, UiamApiKeyProvisioningStatus.COMPLETED),
        nodeBuilder.is(`${statusAttr}.status`, UiamApiKeyProvisioningStatus.SKIPPED),
      ]),
      nodeBuilder.is(`${statusAttr}.entityType`, UiamApiKeyProvisioningEntityType.RULE),
    ]);
    const ruleIds = new Set<string>();
    let page = 1;
    const perPage = 500;
    let hasMore = true;
    while (hasMore) {
      const { saved_objects, total } = await savedObjectsClient.find<{
        entityId: string;
        entityType: string;
        status: string;
      }>({
        type: UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
        filter,
        perPage,
        page,
        namespaces: ['*'],
      });
      for (const so of saved_objects) {
        if (so.attributes?.entityId) {
          ruleIds.add(so.attributes.entityId);
        }
      }
      hasMore = page * perPage < total;
      page += 1;
    }
    return ruleIds;
  };

  private runTask = async (
    taskInstance: ConcreteTaskInstance,
    core: CoreSetup<AlertingPluginsStart>
  ): Promise<{ state: LatestTaskStateSchema; runAt?: Date }> => {
    this.logger.info('=====> Running UIAM API key provisioning task'); // For debugging purposes, to verify that the task is running as expected.

    const state = (taskInstance.state ?? emptyState) as LatestTaskStateSchema;

    const [coreStart] = await core.getStartServices();
    const savedObjectsClient = coreStart.savedObjects.createInternalRepository([
      RULE_SAVED_OBJECT_TYPE,
      UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
    ]);

    const excludedRuleIds = await this.getCompletedOrSkippedRuleIds(savedObjectsClient);
    const excludeRulesFilter =
      excludedRuleIds.size > 0
        ? nodeTypes.function.buildNode('not', [
            convertRuleIdsToKueryNode(Array.from(excludedRuleIds)),
          ])
        : undefined;

    const response = await savedObjectsClient.find<RawRule>({
      type: RULE_SAVED_OBJECT_TYPE,
      perPage: 500,
      namespaces: ['*'],
      ...(excludeRulesFilter ? { filter: excludeRulesFilter } : {}),
    });

    const rulesWithApiKey = response.saved_objects.filter(
      (rule): rule is typeof rule & { attributes: { apiKey: string } } =>
        Boolean(rule.attributes?.apiKey)
    );
    const apiKeys = rulesWithApiKey.map((rule) =>
      Buffer.from(`${rule.id}:${rule.attributes.apiKey}`, 'utf-8').toString('base64')
    );

    const nextUiamKeysById = await generateUiamKeysForRules(apiKeys);

    const updates: Array<SavedObjectsBulkUpdateObject<RawRule>> = response.saved_objects
      .filter((rule) => rule.id in nextUiamKeysById)
      .map((rule) => ({
        type: RULE_SAVED_OBJECT_TYPE,
        id: rule.id,
        attributes: {
          uiamApiKey: nextUiamKeysById[rule.id],
        } as Partial<RawRule>,
        ...(rule.namespaces?.[0] ? { namespace: rule.namespaces[0] } : {}),
      }));

    if (updates.length > 0) {
      try {
        await savedObjectsClient.bulkUpdate(updates);
        const now = new Date().toISOString();
        await savedObjectsClient.bulkCreate(
          updates.map((u) => ({
            type: UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
            id: u.id,
            attributes: {
              '@timestamp': now,
              entityId: u.id,
              entityType: UiamApiKeyProvisioningEntityType.RULE,
              status: UiamApiKeyProvisioningStatus.COMPLETED,
            },
          })),
          { overwrite: true }
        );
      } catch (e) {
        this.logger.error(`Error bulk updating rules: ${e.message}`);
      }
    }

    const hasMoreToConvert = response.total > response.saved_objects.length;

    return {
      state: { runs: state.runs + 1 },
      ...(hasMoreToConvert ? { runAt: new Date(Date.now() + RUN_AT_INTERVAL) } : {}),
    };
  };
}

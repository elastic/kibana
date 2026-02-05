/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, CoreSetup, SavedObjectsBulkUpdateObject } from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
  ConcreteTaskInstance,
  IntervalSchedule,
} from '@kbn/task-manager-plugin/server';
import { nodeBuilder, nodeTypes } from '@kbn/es-query';
import type { AlertingConfig } from '../config';
import type { RawRule } from '../types';
import { RULE_SAVED_OBJECT_TYPE } from '../saved_objects';
import {
  stateSchemaByVersion,
  emptyState,
  type LatestTaskStateSchema,
} from './api_key_migration_task_state';
import type { AlertingPluginsStart } from '../plugin';

export const API_KEY_MIGRATION_TASK_ID = 'api_key_migration';
export const API_KEY_MIGRATION_TASK_TYPE = `alerting:${API_KEY_MIGRATION_TASK_ID}`;
export const API_KEY_MIGRATION_TASK_TASK_SCHEDULE: IntervalSchedule = { interval: '1m' };

const mockUiamApiKeyFromApiKey = (apiKey: string) => {
  const seed = `uiam:${apiKey}`;
  return Buffer.from(seed).toString('base64');
};

export class MigrateApiKeysTask {
  private readonly logger: Logger;
  private readonly isServerless: boolean;

  constructor({
    logger,
    core,
    taskManager,
    isServerless,
    config,
  }: {
    logger: Logger;
    core: CoreSetup<AlertingPluginsStart>;
    taskManager: TaskManagerSetupContract;
    isServerless: boolean;
    config: AlertingConfig;
  }) {
    this.logger = logger;
    this.isServerless = isServerless;

    taskManager.registerTaskDefinitions({
      [API_KEY_MIGRATION_TASK_TYPE]: {
        title: 'API key migration task',
        timeout: '1m',
        stateSchemaByVersion,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            run: async () => {
              return this.runTask(taskInstance, core);
            },
            cancel: async () => {},
          };
        },
      },
    });
  }

  public start = async (taskManager?: TaskManagerStartContract) => {
    if (!this.isServerless) {
      return;
    }
    if (!taskManager) {
      this.logger.error(
        `Missing required task manager service during start of ${API_KEY_MIGRATION_TASK_TYPE}`
      );
      return;
    }

    try {
      await taskManager.ensureScheduled({
        id: API_KEY_MIGRATION_TASK_ID,
        taskType: API_KEY_MIGRATION_TASK_TYPE,
        schedule: API_KEY_MIGRATION_TASK_TASK_SCHEDULE,
        state: emptyState,
        params: {},
      });
    } catch (e) {
      this.logger.error(
        `Error scheduling task ${API_KEY_MIGRATION_TASK_TYPE}, received ${e.message}`
      );
    }
  };

  private runTask = async (
    taskInstance: ConcreteTaskInstance,
    core: CoreSetup<AlertingPluginsStart>
  ): Promise<{ state: LatestTaskStateSchema }> => {
    const state = (taskInstance.state ?? emptyState) as LatestTaskStateSchema;
    const updatedRuleIds = new Set(state.updated_rule_ids ?? []);

    const [coreStart, { encryptedSavedObjects }] = await core.getStartServices();
    const encryptedSavedObjectsClient = encryptedSavedObjects.getClient({
      includedHiddenTypes: [RULE_SAVED_OBJECT_TYPE],
    });
    const savedObjectsClient = coreStart.savedObjects.createInternalRepository([
      RULE_SAVED_OBJECT_TYPE,
    ]);

    const updatedRuleIdsList = Array.from(updatedRuleIds);
    const excludeUpdatedIdsFilter =
      updatedRuleIdsList.length > 0
        ? nodeTypes.function.buildNode('not', [
            nodeBuilder.or(
              updatedRuleIdsList.map((id) =>
                nodeBuilder.is(`${RULE_SAVED_OBJECT_TYPE}.id`, `${RULE_SAVED_OBJECT_TYPE}:${id}`)
              )
            ),
          ])
        : undefined;
    const rulesFinder =
      await encryptedSavedObjectsClient.createPointInTimeFinderDecryptedAsInternalUser<RawRule>({
        type: RULE_SAVED_OBJECT_TYPE,
        perPage: 100,
        namespaces: ['*'],
        filter: excludeUpdatedIdsFilter,
      });

    try {
      for await (const response of rulesFinder.find()) {
        const updates: Array<SavedObjectsBulkUpdateObject<RawRule>> = [];

        for (const rule of response.saved_objects) {
          if (!rule.attributes?.uiamApiKey && rule.attributes?.apiKey) {
            const nextUiamApiKey = mockUiamApiKeyFromApiKey(rule.attributes.apiKey);
            updates.push({
              type: RULE_SAVED_OBJECT_TYPE,
              id: rule.id,
              attributes: { uiamApiKey: nextUiamApiKey },
              ...(rule.namespaces?.[0] ? { namespace: rule.namespaces[0] } : {}),
            });
          }
        }
        if (updates.length > 0) {
          try {
            const bulkUpdateResult = await savedObjectsClient.bulkUpdate(updates);
            bulkUpdateResult.saved_objects.forEach((savedObject) => {
              if (!savedObject.error) {
                updatedRuleIds.add(savedObject.id);
              }
            });
          } catch (e) {
            this.logger.error(`Error bulk updating rules: ${e.message}`);
          }
        }
      }
    } finally {
      await rulesFinder.close();
    }

    return {
      state: { updated_rule_ids: Array.from(updatedRuleIds) },
    };
  };
}

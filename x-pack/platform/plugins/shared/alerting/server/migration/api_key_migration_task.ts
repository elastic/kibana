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

const mockGenerateUiamKeysForRules = (ruleIds: string[]) =>
  ruleIds.reduce<Record<string, string>>((acc, id) => {
    acc[id] = `essu_${id}`;
    return acc;
  }, {});

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
  ): Promise<{ state: LatestTaskStateSchema; runAt?: Date }> => {
    const state = (taskInstance.state ?? emptyState) as LatestTaskStateSchema;
    const updatedRuleIds = new Set(state.updated_rule_ids ?? []);

    const [coreStart] = await core.getStartServices();
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
    const response = await savedObjectsClient.find<RawRule>({
      type: RULE_SAVED_OBJECT_TYPE,
      perPage: 100,
      namespaces: ['*'],
      filter: excludeUpdatedIdsFilter,
    });

    const ruleIdsToConvert = response.saved_objects
      .filter((rule) => rule.attributes?.apiKey)
      .map((rule) => rule.id);

    const nextUiamKeysById = mockGenerateUiamKeysForRules(ruleIdsToConvert);
    const updates: Array<SavedObjectsBulkUpdateObject<RawRule>> = response.saved_objects
      .filter((rule) => rule.id in nextUiamKeysById)
      .map((rule) => ({
        type: RULE_SAVED_OBJECT_TYPE,
        id: rule.id,
        attributes: { uiamApiKey: nextUiamKeysById[rule.id] } as Partial<RawRule>,
        ...(rule.namespaces?.[0] ? { namespace: rule.namespaces[0] } : {}),
      }));

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

    const hasMoreToConvert = response.total > response.saved_objects.length;

    return {
      state: { updated_rule_ids: Array.from(updatedRuleIds) },
      ...(hasMoreToConvert ? { runAt: new Date(Date.now() + 60_000) } : {}),
    };
  };
}

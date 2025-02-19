/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, ISavedObjectsRepository, Logger, SavedObjectsUtils } from '@kbn/core/server';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
  ConcreteTaskInstance,
} from '@kbn/task-manager-plugin/server';
import { RULES_SETTINGS_SAVED_OBJECT_TYPE, RuleTypeRegistry, RulesSettingsAlertDeletionProperties, RulesSettingsProperties } from '../types';
import { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { GetAlertIndicesAlias, spaceIdToNamespace } from '../lib';
import { IEventLogger } from '@kbn/event-log-plugin/server';

export const ALERT_DELETION_TASK_TYPE = 'alert-deletion';

interface ConstructorOpts {
  elasticsearchClientPromise: Promise<ElasticsearchClient>;
  eventLogger: IEventLogger;
  getAlertIndicesAlias: GetAlertIndicesAlias;
  internalSavedObjectsRepositoryPromise: Promise<ISavedObjectsRepository>;
  logger: Logger;
  ruleTypeRegistry: RuleTypeRegistry;
  spacesStartPromise: Promise<SpacesPluginStart | undefined>;
  taskManagerSetup: TaskManagerSetupContract;
  taskManagerStartPromise: Promise<TaskManagerStartContract>;
}

export class AlertDeletionClient {
  private logger: Logger;
  private eventLogger: IEventLogger;
  private elasticsearchClientPromise: Promise<ElasticsearchClient>;
  private readonly getAlertIndicesAlias: GetAlertIndicesAlias;
  private readonly ruleTypeRegistry: RuleTypeRegistry;
  private readonly internalSavedObjectsRepositoryPromise: Promise<ISavedObjectsRepository>;
  private readonly spacesPluginStartPromise: Promise<SpacesPluginStart | undefined>;
  private readonly taskManagerStartPromise: Promise<TaskManagerStartContract>;

  constructor(opts: ConstructorOpts) {
    this.elasticsearchClientPromise = opts.elasticsearchClientPromise;
    this.eventLogger = opts.eventLogger;
    this.getAlertIndicesAlias = opts.getAlertIndicesAlias;
    this.ruleTypeRegistry = opts.ruleTypeRegistry;
    this.internalSavedObjectsRepositoryPromise = opts.internalSavedObjectsRepositoryPromise;
    this.logger = opts.logger;
    this.spacesPluginStartPromise = opts.spacesStartPromise;
    this.taskManagerStartPromise = opts.taskManagerStartPromise;

    // Registers the task that handles alert deletion
    opts.taskManagerSetup.registerTaskDefinitions({
      [ALERT_DELETION_TASK_TYPE]: {
        title: 'Alert deletion task',
        maxAttempts: 1,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          const abortController = new AbortController();
          return {
            run: async () => {
              return this.runTask(taskInstance, abortController);
            },

            cancel: async () => {
              abortController.abort('task timed out');
            },
          };
        },
      },
    });
  }

  public async scheduleTask(spaceIds: string[]) {
    try {
      const taskManager = await this.taskManagerStartPromise;
      await taskManager.ensureScheduled({
        id: `Alerting-${ALERT_DELETION_TASK_TYPE}`,
        taskType: ALERT_DELETION_TASK_TYPE,
        scope: ['alerting'],
        state: {},
        params: { spaceIds },
      });
    } catch (err) {
      this.logger.error(`Error scheduling alert deletion task: ${err.message}`);
      throw err;
    }
  }

  public previewTask(settings: RulesSettingsAlertDeletionProperties, spaceId: string): number {
    // Call library function to preview the number of alerts that would be deleted
    return 0;
  }

  private runTask = async (
    taskInstance: ConcreteTaskInstance,
    abortController: AbortController
  ) => {
    try {
      const runDate = new Date();
      const esClient = await this.elasticsearchClientPromise;
      const internalSavedObjectsRepository = await this.internalSavedObjectsRepositoryPromise;
      const spaces = await this.spacesPluginStartPromise;
      const spaceIds = taskInstance.params.spaceIds;
      const namespaces = spaceIds.map((spaceId: string) => spaceIdToNamespace(spaces, spaceId));

      // Query for rules settings in the specified spaces
      const rulesSettings = await internalSavedObjectsRepository.find<RulesSettingsProperties>({
        type: RULES_SETTINGS_SAVED_OBJECT_TYPE,
        namespaces,
      });

      // For each rules settings, call the library function to delete alerts
      rulesSettings.saved_objects.forEach((settings) => {
        const namespace = settings.namespaces && settings.namespaces.length > 0 ? settings.namespaces[0] : undefined;
        const spaceId = SavedObjectsUtils.namespaceIdToString(namespace);

        const indices = this.getAlertIndicesAlias(this.ruleTypeRegistry.getAllTypes(), spaceId);
      });

      // Add event log entry
    } catch (err) {}
  };
}

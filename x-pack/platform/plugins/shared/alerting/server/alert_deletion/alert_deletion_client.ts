/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, ISavedObjectsRepository, Logger } from '@kbn/core/server';
import { DEFAULT_APP_CATEGORIES, SavedObjectsUtils } from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
  ConcreteTaskInstance,
} from '@kbn/task-manager-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { IEventLogger } from '@kbn/event-log-plugin/server';
import { millisToNanos } from '@kbn/event-log-plugin/server';
import { ALERT_INSTANCE_ID, ALERT_RULE_UUID, SPACE_IDS } from '@kbn/rule-data-utils';
import { omitBy } from 'lodash';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import type { GetAlertIndicesAlias } from '../lib';
import { spaceIdToNamespace } from '../lib';
import type { RuleTypeRegistry, RulesSettingsAlertDeletionProperties } from '../types';
import { RULES_SETTINGS_SAVED_OBJECT_TYPE } from '../types';
import { EVENT_LOG_ACTIONS } from '../plugin';

export const ALERT_DELETION_TASK_TYPE = 'alert-deletion';

const allowedAppCategories = [
  DEFAULT_APP_CATEGORIES.security.id,
  DEFAULT_APP_CATEGORIES.management.id,
  DEFAULT_APP_CATEGORIES.observability.id,
];
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

interface ActiveAlertFilteredSource {
  [ALERT_INSTANCE_ID]: string;
  [ALERT_RULE_UUID]: string;
  [SPACE_IDS]: string;
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
    this.logger = opts.logger.get(ALERT_DELETION_TASK_TYPE);
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

  public async previewTask(
    settings: RulesSettingsAlertDeletionProperties,
    spaceId: string
  ): Promise<number> {
    const esClient = await this.elasticsearchClientPromise;

    const {
      isActiveAlertsDeletionEnabled,
      isInactiveAlertsDeletionEnabled,
      activeAlertsDeletionThreshold,
      inactiveAlertsDeletionThreshold,
      categoryIds,
    } = settings;

    if (categoryIds && categoryIds.length > 0) {
      if (categoryIds.some((category) => !allowedAppCategories.includes(category))) {
        throw new Error(`Invalid category id - ${categoryIds}`);
      }
    }
    const ruleTypes =
      categoryIds && categoryIds.length > 0
        ? this.ruleTypeRegistry.getAllTypesForCategories(categoryIds)
        : this.ruleTypeRegistry.getAllTypes();
    const indices = this.getAlertIndicesAlias(ruleTypes, spaceId);

    let numAlertsToBeDeleted = 0;

    if (isActiveAlertsDeletionEnabled) {
      const activeAlertsQuery = getActiveAlertsQuery(activeAlertsDeletionThreshold, spaceId);

      try {
        const countResponse = await esClient.count({ index: indices, query: activeAlertsQuery });
        numAlertsToBeDeleted += countResponse.count;
      } catch (err) {
        this.logger.error(
          `Error determining the number of active alerts to delete: ${err.message}`
        );
        throw err;
      }
    }

    if (isInactiveAlertsDeletionEnabled) {
      const inactiveAlertsQuery = getInactiveAlertsQuery(inactiveAlertsDeletionThreshold, spaceId);

      try {
        const countResponse = await esClient.count({ index: indices, query: inactiveAlertsQuery });
        numAlertsToBeDeleted += countResponse.count;
      } catch (err) {
        this.logger.error(
          `Error determining the number of inactive alerts to delete: ${err.message}`
        );
        throw err;
      }
    }

    return numAlertsToBeDeleted;
  }

  private runTask = async (
    taskInstance: ConcreteTaskInstance,
    abortController: AbortController
  ) => {
    const runDate = new Date();
    try {
      const internalSavedObjectsRepository = await this.internalSavedObjectsRepositoryPromise;
      const spaces = await this.spacesPluginStartPromise;
      const spaceIds = taskInstance.params.spaceIds;
      const namespaces = spaceIds.map((spaceId: string) => spaceIdToNamespace(spaces, spaceId));

      // Query for rules settings in the specified spaces; create a point in time finder for efficient
      // pagination in case there are a lot of spaces
      const alertDeletionSettingsFinder =
        await internalSavedObjectsRepository.createPointInTimeFinder<RulesSettingsAlertDeletionProperties>(
          {
            type: RULES_SETTINGS_SAVED_OBJECT_TYPE,
            namespaces,
            filter: `rules-settings.attributes.alertDeletion: *`,
            perPage: 100,
          }
        );

      try {
        for await (const response of alertDeletionSettingsFinder.find()) {
          // For each rules settings, call the library function to delete alerts
          for (const settings of response.saved_objects) {
            const namespace =
              settings.namespaces && settings.namespaces.length > 0
                ? settings.namespaces[0]
                : undefined;
            const spaceId = SavedObjectsUtils.namespaceIdToString(namespace);

            try {
              const { numAlertsDeleted, errors } = await this.deleteAlertsForSpace(
                settings.attributes,
                spaceId,
                abortController
              );

              if (errors && errors.length > 0) {
                this.logFailedDeletion(runDate, numAlertsDeleted, [spaceId], errors?.join(', '));
              } else {
                this.logSuccessfulDeletion(runDate, numAlertsDeleted, [spaceId]);
              }
            } catch (err) {
              this.logFailedDeletion(runDate, 0, taskInstance.params.spaceIds, err.message);

              // do we want to retry this task? if so, we should throw a retryable error, otherwise
              // we'll just return.
            }
          }
        }
      } finally {
        await alertDeletionSettingsFinder.close();
      }
    } catch (err) {
      this.logger.error(`Error encountered while running alert deletion task: ${err.message}`, {
        error: { stack_trace: err.stack },
      });

      this.logFailedDeletion(runDate, 0, taskInstance.params.spaceIds, err.message);

      // do we want to retry this task? if so, we should throw a retryable error, otherwise
      // we'll just return.
    }
  };

  private async deleteAlertsForSpace(
    settings: RulesSettingsAlertDeletionProperties,
    spaceId: string,
    abortController: AbortController
  ): Promise<{ numAlertsDeleted: number; errors?: string[] }> {
    const esClient = await this.elasticsearchClientPromise;
    const taskManager = await this.taskManagerStartPromise;

    const {
      isActiveAlertsDeletionEnabled,
      isInactiveAlertsDeletionEnabled,
      activeAlertsDeletionThreshold,
      inactiveAlertsDeletionThreshold,
      categoryIds,
    } = settings;

    if (categoryIds && categoryIds.length > 0) {
      if (categoryIds.some((category) => !allowedAppCategories.includes(category))) {
        return {
          numAlertsDeleted: 0,
          errors: [`Invalid category ID found - ${categoryIds} - not deleting alerts`],
        };
      }
    }

    const ruleTypes =
      categoryIds && categoryIds.length > 0
        ? this.ruleTypeRegistry.getAllTypesForCategories(categoryIds)
        : this.ruleTypeRegistry.getAllTypes();
    const indices = this.getAlertIndicesAlias(ruleTypes, spaceId);

    let numAlertsDeleted = 0;
    const errors = [];

    if (indices.length === 0) {
      this.logger.warn(`No indices found for rules settings ${settings}. No alerts deleted`);
      return { numAlertsDeleted, errors: [`No indices found`] };
    }

    if (isActiveAlertsDeletionEnabled) {
      const activeAlertsQuery = getActiveAlertsQuery(activeAlertsDeletionThreshold, spaceId);

      try {
        const searchResponse = await esClient.search<ActiveAlertFilteredSource>(
          {
            index: indices,
            query: activeAlertsQuery,
            _source: [ALERT_RULE_UUID, SPACE_IDS, ALERT_INSTANCE_ID],
          },
          { signal: abortController.signal }
        );

        // bulk delete the alert documents by id
        const bulkDeleteRequest = [];
        for (const alert of searchResponse.hits.hits) {
          bulkDeleteRequest.push({ delete: { _index: alert._index, _id: alert._id } });
        }
        const bulkDeleteResponse = await esClient.bulk(
          { operations: bulkDeleteRequest },
          { signal: abortController.signal }
        );

        // update the task state for only alerts that were successfully deleted
        const taskIds = new Set<string>();
        const alertUuidsToClear: string[] = [];
        bulkDeleteResponse.items.forEach((item, index) => {
          const alertUuid = searchResponse.hits.hits[index]._id;
          if (item.delete?.result === 'deleted') {
            numAlertsDeleted++;

            const ruleId = searchResponse.hits.hits[index]._source?.[ALERT_RULE_UUID];
            if (ruleId) {
              taskIds.add(`task:${ruleId}`);
            }

            alertUuidsToClear.push(alertUuid!);
          } else {
            errors.push(`Error deleting alert "${alertUuid!}" - ${item.delete?.error?.reason}`);
          }
        });

        await taskManager.bulkUpdateState(Array.from(taskIds), (state) => {
          try {
            const updatedAlertInstances = omitBy(state.alertInstances, ({ meta: { uuid } }) =>
              alertUuidsToClear.includes(uuid)
            );
            return {
              ...state,
              alertInstances: updatedAlertInstances,
            };
          } catch (err) {
            return state;
          }
        });
      } catch (err) {
        const errMessage = `Error deleting active alerts: ${err.message}`;
        this.logger.error(errMessage, { error: { stack_trace: err.stack } });
        errors.push(errMessage);
      }
    }

    if (isInactiveAlertsDeletionEnabled) {
      const inactiveAlertsQuery = getInactiveAlertsQuery(inactiveAlertsDeletionThreshold, spaceId);

      try {
        const dbqResponse = await esClient.deleteByQuery(
          { index: indices, query: inactiveAlertsQuery },
          { signal: abortController.signal }
        );
        numAlertsDeleted += dbqResponse.deleted ?? 0;
      } catch (err) {
        const errMessage = `Error deleting inactive alerts: ${err.message}`;
        this.logger.error(errMessage, { error: { stack_trace: err.stack } });
        errors.push(errMessage);
      }
    }

    return { numAlertsDeleted, ...(errors.length > 0 ? { errors } : {}) };
  }

  private logSuccessfulDeletion(runDate: Date, numDeleted: number, spaceIds: string[]) {
    const end = new Date();
    this.eventLogger.logEvent({
      '@timestamp': runDate.toISOString(),
      event: {
        action: EVENT_LOG_ACTIONS.deleteAlerts,
        outcome: 'success',
        start: runDate.toISOString(),
        end: end.toISOString(),
        duration: millisToNanos(end.getTime() - runDate.getTime()),
      },
      message: `Alert deletion task deleted ${numDeleted} alerts`,
      kibana: {
        alert: {
          deletion: {
            num_deleted: numDeleted,
          },
        },
        space_ids: spaceIds,
      },
    });
  }

  // todo - add field for number of alerts deleted
  private logFailedDeletion(
    runDate: Date,
    numDeleted: number,
    spaceIds: string[],
    errMessage: string
  ) {
    const end = new Date();
    this.eventLogger.logEvent({
      '@timestamp': runDate.toISOString(),
      event: {
        action: EVENT_LOG_ACTIONS.deleteAlerts,
        outcome: 'failure',
        start: runDate.toISOString(),
        end: end.toISOString(),
        duration: millisToNanos(end.getTime() - runDate.getTime()),
      },
      error: { message: errMessage },
      kibana: {
        alert: {
          deletion: {
            num_deleted: numDeleted,
          },
        },
        space_ids: spaceIds,
      },
    });
  }
}

function getActiveAlertsQuery(threshold: number, spaceId: string): QueryDslQueryContainer {
  const filter = `kibana.alert.status: "active" AND kibana.alert.start < "now-${threshold}d" AND NOT kibana.alert.end:* AND NOT kibana.alert.workflow_status_updated_at:* AND ${[
    SPACE_IDS,
  ]}: ${spaceId}`;
  const filterKueryNode = fromKueryExpression(filter);
  return toElasticsearchQuery(filterKueryNode);
}

function getInactiveAlertsQuery(threshold: number, spaceId: string): QueryDslQueryContainer {
  const filter = `((kibana.alert.workflow_status: "closed" OR kibana.alert.workflow_status: "acknowledged") AND kibana.alert.workflow_status_updated_at < "now-${threshold}d") OR ((kibana.alert.status: "untracked" OR kibana.alert.status: "recovered") AND kibana.alert.end < "now-${threshold}d") AND ${[
    SPACE_IDS,
  ]}: ${spaceId}`;
  const filterKueryNode = fromKueryExpression(filter);
  return toElasticsearchQuery(filterKueryNode);
}

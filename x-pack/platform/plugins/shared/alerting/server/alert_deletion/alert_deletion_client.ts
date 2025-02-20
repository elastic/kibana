/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ElasticsearchClient,
  ISavedObjectsRepository,
  Logger,
  SavedObjectsUtils,
} from '@kbn/core/server';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
  ConcreteTaskInstance,
} from '@kbn/task-manager-plugin/server';
import {
  RULES_SETTINGS_SAVED_OBJECT_TYPE,
  RuleTypeRegistry,
  RulesSettingsAlertDeletionProperties,
} from '../types';
import { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { GetAlertIndicesAlias, spaceIdToNamespace } from '../lib';
import { IEventLogger, millisToNanos } from '@kbn/event-log-plugin/server';
import { ALERT_INSTANCE_ID, ALERT_RULE_UUID, SPACE_IDS } from '@kbn/rule-data-utils';
import { compact, omitBy } from 'lodash';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { EVENT_LOG_ACTIONS } from '../plugin';

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

  public async previewTask(
    settings: RulesSettingsAlertDeletionProperties,
    spaceId: string
  ): Promise<number> {
    const esClient = await this.elasticsearchClientPromise;
    const indices = this.getAlertIndicesAlias(this.ruleTypeRegistry.getAllTypes(), spaceId);

    const {
      isActiveAlertsDeletionEnabled,
      isInactiveAlertsDeletionEnabled,
      activeAlertsDeletionThreshold,
      inactiveAlertsDeletionThreshold,
    } = settings;

    let numAlertsToBeDeleted = 0;

    // TODO - are we filtering by solution type?

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
    try {
      const runDate = new Date();
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
            const start = new Date();
            const namespace =
              settings.namespaces && settings.namespaces.length > 0
                ? settings.namespaces[0]
                : undefined;
            const spaceId = SavedObjectsUtils.namespaceIdToString(namespace);

            try {
              const numDeleted = await this.deleteAlertsForSpace(
                settings.attributes,
                spaceId,
                abortController
              );

              const end = new Date();

              // Add event log entry to record the last time alerts were deleted in this space
              this.eventLogger.logEvent({
                '@timestamp': runDate.toISOString(),
                event: {
                  action: EVENT_LOG_ACTIONS.deleteAlerts,
                  outcome: 'success',
                  start: start.toISOString(),
                  end: end.toISOString(),
                  duration: millisToNanos(end.getTime() - start.getTime()),
                },
                message: `Alert deletion task deleted ${numDeleted} alerts`,
                kibana: { space_ids: [spaceId] },
              });
            } catch (err) {
              const end = new Date();
              this.eventLogger.logEvent({
                '@timestamp': runDate.toISOString(),
                event: {
                  action: EVENT_LOG_ACTIONS.deleteAlerts,
                  outcome: 'failure',
                  start: start.toISOString(),
                  end: end.toISOString(),
                  duration: millisToNanos(end.getTime() - start.getTime()),
                },
                error: { message: err.message },
                kibana: { space_ids: [spaceId] },
              });
            }
          }
        }
      } finally {
        await alertDeletionSettingsFinder.close();
      }
    } catch (err) {}
  };

  private async deleteAlertsForSpace(
    settings: RulesSettingsAlertDeletionProperties,
    spaceId: string,
    abortController: AbortController
  ) {
    const esClient = await this.elasticsearchClientPromise;
    const taskManager = await this.taskManagerStartPromise;
    const indices = this.getAlertIndicesAlias(this.ruleTypeRegistry.getAllTypes(), spaceId);

    const {
      isActiveAlertsDeletionEnabled,
      isInactiveAlertsDeletionEnabled,
      activeAlertsDeletionThreshold,
      inactiveAlertsDeletionThreshold,
    } = settings;

    let numAlertsDeleted = 0;

    // TODO - are we filtering by solution type?

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

        // get the task documents
        const taskIds: string[] = compact(
          searchResponse.hits.hits.map((hit) => {
            const ruleId = hit._source?.[ALERT_RULE_UUID];
            if (ruleId) {
              return `task:${ruleId}`;
            }
          })
        );
        const alertUuidsToClear = searchResponse.hits.hits.map((hit) => hit._id);

        await taskManager.bulkUpdateState(taskIds, (state) => {
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

        bulkDeleteResponse.items.forEach((item) => {
          if (item.delete?.result === 'deleted') {
            numAlertsDeleted++;
          }
        });
      } catch (err) {
        this.logger.error(`Error deleting active alerts: ${err.message}`);
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
        this.logger.error(`Error deleting inactive alerts: ${err.message}`);
      }
    }

    return numAlertsDeleted;
  }
}

function getActiveAlertsQuery(threshold: number, spaceId: string): QueryDslQueryContainer {
  const filter = `(event.kind: "open" OR event.kind: "active") AND kibana.alert.start < "now-${threshold}d" AND NOT kibana.alert.end:* AND ${[
    SPACE_IDS,
  ]}: ${spaceId}`;
  const filterKueryNode = fromKueryExpression(filter);
  return toElasticsearchQuery(filterKueryNode);
}

function getInactiveAlertsQuery(threshold: number, spaceId: string): QueryDslQueryContainer {
  const filter = `((event.kind: "close" AND @timestamp < "now-${threshold}d") OR (kibana.alert.workflow_status: "closed" AND kibana.alert.workflow_status_updated_at < "now-${threshold}d") OR (kibana.alert.status: "untracked" AND kibana.alert.end < "now-${threshold}d")) AND ${[
    SPACE_IDS,
  ]}: ${spaceId}`;
  const filterKueryNode = fromKueryExpression(filter);
  return toElasticsearchQuery(filterKueryNode);
}

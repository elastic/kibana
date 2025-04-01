/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ElasticsearchClient,
  KibanaRequest,
  Logger,
  SecurityServiceStart,
} from '@kbn/core/server';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
  ConcreteTaskInstance,
} from '@kbn/task-manager-plugin/server';
import type { IEventLogger, IValidatedEvent } from '@kbn/event-log-plugin/server';
import { millisToNanos } from '@kbn/event-log-plugin/server';
import { ALERT_INSTANCE_ID, ALERT_RULE_UUID, SPACE_IDS, TIMESTAMP } from '@kbn/rule-data-utils';
import { omitBy } from 'lodash';
import type {
  QueryDslQueryContainer,
  SearchResponse,
  SortResults,
} from '@elastic/elasticsearch/lib/api/types';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import type { AuditServiceSetup } from '@kbn/security-plugin-types-server';
import type { SpacesServiceStart } from '@kbn/spaces-plugin/server';
import type { RulesSettingsAlertDeleteProperties } from '@kbn/alerting-types';
import type { GetAlertIndicesAlias } from '../lib';
import { AlertAuditAction, alertAuditEvent, alertAuditSystemEvent } from '../lib';
import type { RuleTypeRegistry } from '../types';
import { EVENT_LOG_ACTIONS, EVENT_LOG_PROVIDER } from '../plugin';

export const ALERT_DELETION_TASK_TYPE = 'alert-deletion';

const PAGE_SIZE = 1000;
const MAX_ALERTS_TO_DELETE = 10000;

const allowedAppCategories = [
  DEFAULT_APP_CATEGORIES.security.id,
  DEFAULT_APP_CATEGORIES.management.id,
  DEFAULT_APP_CATEGORIES.observability.id,
];
interface ConstructorOpts {
  auditService?: AuditServiceSetup;
  elasticsearchClientPromise: Promise<ElasticsearchClient>;
  eventLogger: IEventLogger;
  getAlertIndicesAlias: GetAlertIndicesAlias;
  logger: Logger;
  ruleTypeRegistry: RuleTypeRegistry;
  securityService: Promise<SecurityServiceStart>;
  spacesService: Promise<SpacesServiceStart | undefined>;
  taskManagerSetup: TaskManagerSetupContract;
  taskManagerStartPromise: Promise<TaskManagerStartContract>;
}

interface AlertFilteredSource {
  [ALERT_INSTANCE_ID]: string;
  [ALERT_RULE_UUID]: string;
  [SPACE_IDS]: string;
}

export class AlertDeletionClient {
  private logger: Logger;
  private eventLogger: IEventLogger;
  private elasticsearchClientPromise: Promise<ElasticsearchClient>;
  private readonly auditService?: AuditServiceSetup;
  private readonly getAlertIndicesAlias: GetAlertIndicesAlias;
  private readonly ruleTypeRegistry: RuleTypeRegistry;
  private readonly securityService: Promise<SecurityServiceStart>;
  private readonly spacesService: Promise<SpacesServiceStart | undefined>;
  private readonly taskManagerStartPromise: Promise<TaskManagerStartContract>;

  constructor(opts: ConstructorOpts) {
    this.auditService = opts.auditService;
    this.elasticsearchClientPromise = opts.elasticsearchClientPromise;
    this.eventLogger = opts.eventLogger;
    this.getAlertIndicesAlias = opts.getAlertIndicesAlias;
    this.ruleTypeRegistry = opts.ruleTypeRegistry;
    this.logger = opts.logger.get(ALERT_DELETION_TASK_TYPE);
    this.securityService = opts.securityService;
    this.spacesService = opts.spacesService;
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

  public async getLastRun(req: KibanaRequest): Promise<string | undefined> {
    const esClient = await this.elasticsearchClientPromise;
    const spacesService = await this.spacesService;
    const currentSpaceId = spacesService ? spacesService.getSpaceId(req) : 'default';

    try {
      const searchResponse: SearchResponse<IValidatedEvent> = await esClient.search({
        index: '.kibana-event-log*',
        query: {
          bool: {
            filter: [
              { term: { 'event.action': EVENT_LOG_ACTIONS.deleteAlerts } },
              { term: { 'event.provider': EVENT_LOG_PROVIDER } },
              { term: { 'kibana.space_ids': currentSpaceId } },
            ],
          },
        },
        size: 1,
        sort: [{ [TIMESTAMP]: 'desc' }],
      });

      if (searchResponse.hits.hits.length > 0) {
        return searchResponse.hits.hits[0]._source?.['@timestamp'];
      }
    } catch (err) {
      this.logger.error(`Error getting last run date: ${err.message}`);
    }
  }

  public async scheduleTask(
    request: KibanaRequest,
    settings: RulesSettingsAlertDeleteProperties,
    spaceIds: string[]
  ) {
    try {
      const taskManager = await this.taskManagerStartPromise;
      await taskManager.ensureScheduled({
        id: `Alerting-${ALERT_DELETION_TASK_TYPE}`,
        taskType: ALERT_DELETION_TASK_TYPE,
        scope: ['alerting'],
        state: {},
        params: { settings, spaceIds },
      });

      const securityService = await this.securityService;
      const user = securityService.authc.getCurrentUser(request);
      this.auditService?.asScoped(request)?.log(
        alertAuditEvent({
          action: AlertAuditAction.SCHEDULE_DELETE,
          outcome: 'success',
          actor: user?.username,
          bulk: true,
        })
      );
    } catch (err) {
      this.logger.error(`Error scheduling alert deletion task: ${err.message}`);
      this.auditService?.asScoped(request)?.log(
        alertAuditEvent({
          action: AlertAuditAction.SCHEDULE_DELETE,
          outcome: 'failure',
          bulk: true,
          error: err,
        })
      );
      throw err;
    }
  }

  public async previewTask(
    settings: RulesSettingsAlertDeleteProperties,
    spaceId: string
  ): Promise<number> {
    const esClient = await this.elasticsearchClientPromise;

    const {
      isActiveAlertDeleteEnabled,
      isInactiveAlertDeleteEnabled,
      activeAlertDeleteThreshold,
      inactiveAlertDeleteThreshold,
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

    if (isActiveAlertDeleteEnabled) {
      const activeAlertsQuery = getActiveAlertsQuery(activeAlertDeleteThreshold, spaceId);

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

    if (isInactiveAlertDeleteEnabled) {
      const inactiveAlertsQuery = getInactiveAlertsQuery(inactiveAlertDeleteThreshold, spaceId);

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
      const settings = taskInstance.params.settings;
      const spaceIds = taskInstance.params.spaceIds;

      if (!spaceIds || spaceIds.length === 0 || !settings) {
        throw new Error(`Invalid task parameters: ${JSON.stringify(taskInstance.params)}`);
      }

      for (const spaceId of spaceIds) {
        try {
          const { numAlertsDeleted, errors } = await this.deleteAlertsForSpace(
            settings,
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
        }
      }
    } catch (err) {
      this.logger.error(`Error encountered while running alert deletion task: ${err.message}`, {
        error: { stack_trace: err.stack },
      });

      this.logFailedDeletion(runDate, 0, taskInstance.params.spaceIds, err.message);
    }
  };

  private async deleteAlertsForSpace(
    settings: RulesSettingsAlertDeleteProperties,
    spaceId: string,
    abortController: AbortController
  ): Promise<{ numAlertsDeleted: number; errors?: string[] }> {
    const taskManager = await this.taskManagerStartPromise;

    const {
      isActiveAlertDeleteEnabled,
      isInactiveAlertDeleteEnabled,
      activeAlertDeleteThreshold,
      inactiveAlertDeleteThreshold,
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

    if (isActiveAlertDeleteEnabled) {
      const activeAlertsQuery = getActiveAlertsQuery(activeAlertDeleteThreshold, spaceId);

      try {
        const {
          numAlertsDeleted: numActiveAlertsDeleted,
          taskIds,
          alertUuidsToClear,
          errors: activeAlertDeletionErrors,
        } = await this.deleteAlertsForQuery(indices, activeAlertsQuery, abortController);

        numAlertsDeleted += numActiveAlertsDeleted;
        errors.push(...activeAlertDeletionErrors);

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

    if (isInactiveAlertDeleteEnabled) {
      const inactiveAlertsQuery = getInactiveAlertsQuery(inactiveAlertDeleteThreshold, spaceId);

      try {
        const { numAlertsDeleted: numInactiveAlertsDeleted, errors: inactiveAlertDeletionErrors } =
          await this.deleteAlertsForQuery(indices, inactiveAlertsQuery, abortController);
        numAlertsDeleted += numInactiveAlertsDeleted;
        errors.push(...inactiveAlertDeletionErrors);
      } catch (err) {
        const errMessage = `Error deleting inactive alerts: ${err.message}`;
        this.logger.error(errMessage, { error: { stack_trace: err.stack } });
        errors.push(errMessage);
      }
    }

    return { numAlertsDeleted, ...(errors.length > 0 ? { errors } : {}) };
  }

  private async deleteAlertsForQuery(
    indices: string[],
    query: QueryDslQueryContainer,
    abortController: AbortController
  ) {
    const esClient = await this.elasticsearchClientPromise;

    let numAlertsDeleted = 0;
    let pitId: string | undefined | null = null;
    let searchAfter: SortResults | null | undefined = null;
    const errors: string[] = [];
    const taskIds = new Set<string>();
    const alertUuidsToClear: string[] = [];

    do {
      if (!pitId) {
        const pitResponse = await esClient.openPointInTime({
          index: indices,
          keep_alive: '1m',
          ignore_unavailable: true,
        });
        pitId = pitResponse.id;
      }

      try {
        // query for alerts to delete, sorted to return oldest first
        const searchResponse: SearchResponse<AlertFilteredSource> = await esClient.search(
          {
            query,
            size: PAGE_SIZE,
            sort: [{ [TIMESTAMP]: 'asc' }],
            pit: { id: pitId, keep_alive: '1m' },
            _source: [ALERT_RULE_UUID, SPACE_IDS, ALERT_INSTANCE_ID, TIMESTAMP],
            ...(searchAfter ? { search_after: searchAfter } : {}),
          },
          { signal: abortController.signal }
        );

        if (searchResponse.hits.hits.length === 0) {
          searchAfter = null;
        } else {
          const numResults = searchResponse.hits.hits.length;
          searchAfter = searchResponse.hits.hits[numResults - 1].sort;

          // bulk delete the alert documents by id
          const bulkDeleteRequest = [];
          for (const alert of searchResponse.hits.hits) {
            bulkDeleteRequest.push({ delete: { _index: alert._index, _id: alert._id } });
          }
          const bulkDeleteResponse = await esClient.bulk(
            { operations: bulkDeleteRequest },
            { signal: abortController.signal }
          );

          // iterate and audit log each alert by ID
          bulkDeleteResponse.items.forEach((item, index) => {
            const alertUuid = searchResponse.hits.hits[index]._id;
            if (item.delete?.result === 'deleted') {
              numAlertsDeleted++;

              const ruleId = searchResponse.hits.hits[index]._source?.[ALERT_RULE_UUID];
              if (ruleId) {
                taskIds.add(ruleId);
              }

              alertUuidsToClear.push(alertUuid!);

              this.auditService?.withoutRequest.log(
                alertAuditSystemEvent({
                  action: AlertAuditAction.DELETE,
                  id: alertUuid,
                  outcome: 'success',
                })
              );
            } else {
              this.auditService?.withoutRequest.log(
                alertAuditSystemEvent({
                  action: AlertAuditAction.DELETE,
                  id: alertUuid,
                  outcome: 'failure',
                  error: new Error(item.delete?.error?.reason),
                })
              );
              errors.push(`Error deleting alert "${alertUuid!}" - ${item.delete?.error?.reason}`);
            }
          });
        }
      } catch (err) {
        if (pitId) {
          await esClient.closePointInTime({ id: pitId });
          pitId = null;
        }
        throw err;
      }
    } while (searchAfter != null && numAlertsDeleted < MAX_ALERTS_TO_DELETE);

    try {
      if (pitId) {
        await esClient.closePointInTime({ id: pitId });
      }
    } catch (closeErr) {
      this.logger.error(
        `Failed to close point in time during alert deletion task: ${closeErr.message}`
      );
    }

    return { numAlertsDeleted, taskIds, alertUuidsToClear, errors };
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

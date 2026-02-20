/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import {
  ALERT_INSTANCE_ID,
  ALERT_RULE_UUID,
  ALERT_STATUS,
  ALERT_UUID,
  ALERT_MAINTENANCE_WINDOW_IDS,
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_RECOVERED,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_STATUS_UNTRACKED,
  TIMESTAMP,
  ALERT_SCHEDULED_ACTION_GROUP,
  ALERT_SCHEDULED_ACTION_DATE,
  ALERT_SCHEDULED_ACTION_THROTTLING,
  ALERT_STATUS_DELAYED,
} from '@kbn/rule-data-utils';
import { get, isEmpty } from 'lodash';
import type {
  MsearchRequestItem,
  MsearchResponseItem,
  SearchRequest,
} from '@elastic/elasticsearch/lib/api/types';
import type { Alert } from '@kbn/alerts-as-data-utils';
import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import type { DeepPartial } from '@kbn/utility-types';
import type { BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import { CLUSTER_BLOCK_EXCEPTION } from '../lib/error_with_type';
import type { UntypedNormalizedRuleType } from '../rule_type_registry';
import type {
  SummarizedAlerts,
  ScopedQueryAlerts,
  AlertInstanceContext,
  AlertInstanceState,
  RuleAlertData,
  WithoutReservedActionGroups,
  DataStreamAdapter,
} from '../types';
import { LegacyAlertsClient } from './legacy_alerts_client';
import type { IIndexPatternString } from '../alerts_service/resource_installer_utils';
import { getIndexTemplateAndPattern } from '../alerts_service/resource_installer_utils';
import type { CreateAlertsClientParams } from '../alerts_service/alerts_service';
import type {
  AlertRule,
  LogAlertsOpts,
  SearchResult,
  DetermineDelayedAlertsOpts,
  AlertsToUpdateWithMaintenanceWindows,
  AlertsToUpdateWithLastScheduledActions,
} from './types';
import type {
  IAlertsClient,
  InitializeExecutionOpts,
  ReportedAlert,
  ReportedAlertData,
  UpdateableAlert,
  GetSummarizedAlertsParams,
  GetMaintenanceWindowScopedQueryAlertsParams,
} from './types';
import {
  formatRule,
  getHitsWithCount,
  getLifecycleAlertsQueries,
  getMaintenanceWindowAlertsQuery,
  getContinualAlertsQuery,
  AlertBuilder,
} from './lib';
import { resolveAlertConflicts } from './lib/alert_conflict_resolver';
import {
  filterMaintenanceWindows,
  filterMaintenanceWindowsIds,
} from '../task_runner/maintenance_windows';
import { ErrorWithType } from '../lib/error_with_type';
import { DEFAULT_MAX_ALERTS } from '../config';
import { RUNTIME_MAINTENANCE_WINDOW_ID_FIELD } from './lib/get_summarized_alerts_query';
import { retryTransientEsErrors } from '../lib/retry_transient_es_errors';

export interface AlertsClientParams extends CreateAlertsClientParams {
  elasticsearchClientPromise: Promise<ElasticsearchClient>;
  kibanaVersion: string;
  dataStreamAdapter: DataStreamAdapter;
  isServerless: boolean;
}

export interface TrackedAADAlerts<AlertData extends RuleAlertData> {
  indices: Record<string, string>;
  active: Record<string, Alert & AlertData>;
  recovered: Record<string, Alert & AlertData>;
  delayed: Record<string, Alert & AlertData>;
  all: Record<string, Alert & AlertData>;
  seqNo: Record<string, number | undefined>;
  primaryTerm: Record<string, number | undefined>;
  get: (uuid: string) => Alert & AlertData;
  getById: (id: string) => (Alert & AlertData) | undefined;
}

export class AlertsClient<
  AlertData extends RuleAlertData,
  LegacyState extends AlertInstanceState,
  LegacyContext extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> implements
    IAlertsClient<AlertData, LegacyState, LegacyContext, ActionGroupIds, RecoveryActionGroupId>
{
  private legacyAlertsClient: LegacyAlertsClient<
    LegacyState,
    LegacyContext,
    ActionGroupIds,
    RecoveryActionGroupId
  >;

  // Query for alerts from the previous execution in order to identify the
  // correct index to use if and when we need to make updates to existing active or
  // recovered alerts
  private trackedAlerts: TrackedAADAlerts<AlertData>;

  private startedAtString: string | null = null;
  private runTimestampString: string | undefined;
  private rule: AlertRule;
  private ruleType: UntypedNormalizedRuleType;
  private readonly isServerless: boolean;

  private indexTemplateAndPattern: IIndexPatternString;

  private reportedAlerts: Record<string, DeepPartial<AlertData>> = {};
  private _isUsingDataStreams: boolean;
  private ruleInfoMessage: string;
  private logTags: { tags: string[] };

  constructor(private readonly options: AlertsClientParams) {
    this.legacyAlertsClient = new LegacyAlertsClient<
      LegacyState,
      LegacyContext,
      ActionGroupIds,
      RecoveryActionGroupId
    >({
      alertingEventLogger: this.options.alertingEventLogger,
      logger: this.options.logger,
      maintenanceWindowsService: this.options.maintenanceWindowsService,
      request: this.options.request,
      ruleType: this.options.ruleType,
      spaceId: this.options.spaceId,
    });
    this.indexTemplateAndPattern = getIndexTemplateAndPattern({
      context: this.options.ruleType.alerts?.context!,
      namespace: this.options.ruleType.alerts?.isSpaceAware
        ? this.options.namespace
        : DEFAULT_NAMESPACE_STRING,
    });
    this.trackedAlerts = {
      indices: {},
      active: {},
      recovered: {},
      delayed: {},
      all: {},
      seqNo: {},
      primaryTerm: {},
      get(uuid: string) {
        return this.all[uuid];
      },
      getById(id: string) {
        return Object.values(this.all).find((alert) => get(alert, ALERT_INSTANCE_ID) === id);
      },
    };
    this.rule = formatRule({ rule: this.options.rule, ruleType: this.options.ruleType });
    this.ruleType = options.ruleType;
    this._isUsingDataStreams = this.options.dataStreamAdapter.isUsingDataStreams();
    this.ruleInfoMessage = `for ${this.ruleType.id}:${this.options.rule.id} '${this.options.rule.name}'`;
    this.logTags = { tags: [this.ruleType.id, this.options.rule.id, 'alerts-client'] };
    this.isServerless = options.isServerless;
  }

  public async initializeExecution(opts: InitializeExecutionOpts) {
    this.startedAtString = opts.startedAt ? opts.startedAt.toISOString() : null;

    const { runTimestamp } = opts;

    if (runTimestamp) {
      this.runTimestampString = runTimestamp.toISOString();
    }
    await this.legacyAlertsClient.initializeExecution(opts);

    // No need to fetch the tracked alerts for the non-lifecycle rules
    if (this.ruleType.autoRecoverAlerts) {
      const maxAlertLimit = this.legacyAlertsClient.getMaxAlertLimit();
      const getTrackedAlerts = async () => {
        // We can use inner_hits to get the alerts for the most recent executions
        // but this may return too many alerts, therefore we make two queries:
        // 1. Get the most recent execution UUIDs
        // 2. Get the alerts for those execution UUIDs
        // We can optimize this in the future once https://github.com/elastic/kibana/issues/235846 is
        // implemented to allow filtering the ongoing recovered alerts. Then we can just query for
        // the alerts of the latest execution by setting the size to 1 and adding inner_hits.
        const executions = await this.search({
          size: opts.flappingSettings.lookBackWindow,
          query: {
            bool: {
              must: [{ term: { [ALERT_RULE_UUID]: this.options.rule.id } }],
            },
          },
          collapse: {
            field: ALERT_RULE_EXECUTION_UUID,
          },
          _source: false,
          sort: [{ [TIMESTAMP]: { order: 'desc' } }],
        });

        const executionUuids = (executions.hits || [])
          .map((hit) => get(hit.fields, ALERT_RULE_EXECUTION_UUID))
          .flat()
          .filter((uuid) => uuid !== null);

        const alerts = await this.search({
          size: (maxAlertLimit || DEFAULT_MAX_ALERTS) * 2,
          seq_no_primary_term: true,
          query: {
            bool: {
              must: [{ term: { [ALERT_RULE_UUID]: this.options.rule.id } }],
              must_not: [{ term: { [ALERT_STATUS]: ALERT_STATUS_UNTRACKED } }],
              filter: [{ terms: { [ALERT_RULE_EXECUTION_UUID]: executionUuids } }],
            },
          },
        });
        return alerts.hits;
      };

      try {
        const results = await getTrackedAlerts();

        for (const hit of results) {
          const alertHit = hit._source as Alert & AlertData;
          const alertUuid = get(alertHit, ALERT_UUID);

          this.trackedAlerts.all[alertUuid] = alertHit;

          if (get(alertHit, ALERT_STATUS) === ALERT_STATUS_ACTIVE) {
            this.trackedAlerts.active[alertUuid] = alertHit;
          }
          if (get(alertHit, ALERT_STATUS) === ALERT_STATUS_RECOVERED) {
            this.trackedAlerts.recovered[alertUuid] = alertHit;
          }
          if (get(alertHit, ALERT_STATUS) === ALERT_STATUS_DELAYED) {
            this.trackedAlerts.delayed[alertUuid] = alertHit;
          }
          this.trackedAlerts.indices[alertUuid] = hit._index;
          this.trackedAlerts.seqNo[alertUuid] = hit._seq_no;
          this.trackedAlerts.primaryTerm[alertUuid] = hit._primary_term;
        }
      } catch (err) {
        this.options.logger.error(
          `Error searching for tracked alerts by UUID ${this.ruleInfoMessage} - ${err.message}`,
          this.logTags
        );
        throw err;
      }
    }
  }

  public async search<Aggregation = unknown>(
    queryBody: SearchRequest
  ): Promise<SearchResult<AlertData, Aggregation>> {
    const esClient = await this.options.elasticsearchClientPromise;
    const index = this.isUsingDataStreams()
      ? this.indexTemplateAndPattern.alias
      : this.indexTemplateAndPattern.pattern;
    const {
      hits: { hits, total },
      aggregations,
    } = await esClient.search<Alert & AlertData, Aggregation>({
      index,
      ...queryBody,
      ignore_unavailable: true,
    });

    return { hits, total, aggregations };
  }

  public async msearch<Aggregation = unknown>(
    searches: MsearchRequestItem[]
  ): Promise<Array<MsearchResponseItem<Alert & AlertData>>> {
    const esClient = await this.options.elasticsearchClientPromise;
    const index = this.isUsingDataStreams()
      ? this.indexTemplateAndPattern.alias
      : this.indexTemplateAndPattern.pattern;
    const { responses } = await esClient.msearch<Alert & AlertData>({
      index,
      searches,
      ignore_unavailable: true,
    });

    return responses;
  }

  public report(
    alert: ReportedAlert<
      AlertData,
      LegacyState,
      LegacyContext,
      WithoutReservedActionGroups<ActionGroupIds, RecoveryActionGroupId>
    >
  ): ReportedAlertData<AlertData> {
    const context = alert.context ? alert.context : ({} as LegacyContext);
    const state = !isEmpty(alert.state) ? alert.state : null;

    // Create a legacy alert
    const legacyAlert = this.legacyAlertsClient
      .factory()
      .create(alert.id)
      .scheduleActions(alert.actionGroup, context);

    if (state) {
      legacyAlert.replaceState(state);
    }

    // Save the alert payload
    if (alert.payload) {
      this.reportedAlerts[alert.id] = alert.payload;
    }
    return {
      uuid: legacyAlert.getUuid(),
      start: legacyAlert.getStart() ?? this.startedAtString,
      alertDoc: this.trackedAlerts.getById(alert.id),
    };
  }

  public setAlertData(
    alert: UpdateableAlert<AlertData, LegacyState, LegacyContext, ActionGroupIds>
  ) {
    const context = alert.context ? alert.context : ({} as LegacyContext);

    // Allow setting context and payload on known alerts only
    // Alerts are known if they have been reported in this execution or are recovered
    const alertToUpdate = this.legacyAlertsClient.getAlert(alert.id);

    if (!alertToUpdate) {
      throw new Error(
        `Cannot set alert data for alert ${alert.id} because it has not been reported and it is not recovered.`
      );
    }

    // Set the alert context
    alertToUpdate.setContext(context);

    // Save the alert payload
    if (alert.payload) {
      this.reportedAlerts[alert.id] = alert.payload;
    }
  }

  public isTrackedAlert(id: string) {
    const alert = this.trackedAlerts.getById(id);
    const uuid = alert?.[ALERT_UUID];
    if (uuid) {
      return !!this.trackedAlerts.active[uuid];
    }
    return false;
  }

  public hasReachedAlertLimit(): boolean {
    return this.legacyAlertsClient.hasReachedAlertLimit();
  }

  public getMaxAlertLimit(): number {
    return this.legacyAlertsClient.getMaxAlertLimit();
  }

  public checkLimitUsage() {
    return this.legacyAlertsClient.checkLimitUsage();
  }

  public async processAlerts() {
    await this.legacyAlertsClient.processAlerts();
  }

  public determineFlappingAlerts() {
    this.legacyAlertsClient.determineFlappingAlerts();
  }

  public determineDelayedAlerts(opts: DetermineDelayedAlertsOpts) {
    this.legacyAlertsClient.determineDelayedAlerts(opts);
  }

  public logAlerts(opts: LogAlertsOpts) {
    this.legacyAlertsClient.logAlerts(opts);
  }

  public getProcessedAlerts(
    type: 'new' | 'active' | 'trackedActiveAlerts' | 'recovered' | 'trackedRecoveredAlerts'
  ) {
    return this.legacyAlertsClient.getProcessedAlerts(type);
  }

  public getRawAlertInstancesForState(shouldOptimizeTaskState?: boolean) {
    return this.legacyAlertsClient.getRawAlertInstancesForState(shouldOptimizeTaskState);
  }

  public factory() {
    return this.legacyAlertsClient.factory();
  }

  public async getSummarizedAlerts({
    ruleId,
    spaceId,
    excludedAlertInstanceIds,
    alertsFilter,
    start,
    end,
    executionUuid,
  }: GetSummarizedAlertsParams): Promise<SummarizedAlerts> {
    if (!ruleId || !spaceId) {
      throw new Error(`Must specify both rule ID and space ID for AAD alert query.`);
    }
    const queryByExecutionUuid = !!executionUuid;
    const queryByTimeRange: boolean = !!start && !!end;
    // Either executionUuid or start/end dates must be specified, but not both
    if (
      (!queryByExecutionUuid && !queryByTimeRange) ||
      (queryByExecutionUuid && queryByTimeRange)
    ) {
      throw new Error(`Must specify either execution UUID or time range for AAD alert query.`);
    }

    const maxAlertLimit = this.legacyAlertsClient.getMaxAlertLimit();

    const getQueryParams = {
      executionUuid,
      start,
      end,
      ruleId,
      excludedAlertInstanceIds,
      alertsFilter,
      maxAlertLimit,
    };

    const formatAlert = this.ruleType.alerts?.formatAlert;

    const isLifecycleAlert = this.ruleType.autoRecoverAlerts ?? false;

    if (isLifecycleAlert) {
      const queryBodies = getLifecycleAlertsQueries(getQueryParams);
      const responses = await Promise.all(queryBodies.map((queryBody) => this.search(queryBody)));

      return {
        new: getHitsWithCount(responses[0], formatAlert),
        ongoing: getHitsWithCount(responses[1], formatAlert),
        recovered: getHitsWithCount(responses[2], formatAlert),
      };
    }

    const response = await this.search(getContinualAlertsQuery(getQueryParams));

    return {
      new: getHitsWithCount(response, formatAlert),
      ongoing: { count: 0, data: [] },
      recovered: { count: 0, data: [] },
    };
  }

  public async persistAlerts() {
    if (!this.ruleType.alerts?.shouldWrite) {
      this.options.logger.debug(
        `Resources registered and installed for ${this.ruleType.alerts?.context} context but "shouldWrite" is set to false ${this.ruleInfoMessage}.`,
        this.logTags
      );
      return;
    }
    const currentTime = this.startedAtString ?? new Date().toISOString();
    const esClient = await this.options.elasticsearchClientPromise;

    const alertBuilder = new AlertBuilder<
      LegacyState,
      LegacyContext,
      ActionGroupIds,
      RecoveryActionGroupId,
      AlertData
    >({
      rule: this.rule,
      reportedAlerts: this.reportedAlerts,
      trackedAlerts: this.trackedAlerts,
      legacyAlertsClient: this.legacyAlertsClient,
      currentTime,
      logger: this.options.logger,
      ruleType: this.ruleType,
      alertRuleData: this.options.rule,
      runTimestampString: this.runTimestampString,
      kibanaVersion: this.options.kibanaVersion,
      indexTemplateAndPattern: this.indexTemplateAndPattern,
      ruleInfoMessage: this.ruleInfoMessage,
      logTags: this.logTags,
      isUsingDataStreams: this.isUsingDataStreams(),
    });

    const alertsToIndex = alertBuilder.buildAlerts();

    if (alertsToIndex.length > 0) {
      const bulkBody = alertBuilder.getBulkBody(alertsToIndex);

      try {
        const response = await esClient.bulk({
          // On serverless we can force a refresh to we don't wait for the longer refresh interval
          // When too many refresh calls are done in a short period of time, they are throttled by stateless Elasticsearch
          refresh: this.isServerless ? true : 'wait_for',
          index: this.indexTemplateAndPattern.alias,
          require_alias: !this.isUsingDataStreams(),
          body: bulkBody,
        });

        // If there were individual indexing errors, they will be returned in the success response
        if (response && response.errors) {
          this.throwIfHasClusterBlockException(response);

          await resolveAlertConflicts({
            logger: this.options.logger,
            esClient,
            bulkRequest: {
              refresh: 'wait_for',
              index: this.indexTemplateAndPattern.alias,
              require_alias: !this.isUsingDataStreams(),
              operations: bulkBody,
            },
            bulkResponse: response,
            ruleId: this.options.rule.id,
            ruleName: this.options.rule.name,
            ruleType: this.ruleType.id,
          });
        }
      } catch (err) {
        this.options.logger.error(
          `Error writing ${alertsToIndex.length} alerts to ${this.indexTemplateAndPattern.alias} ${this.ruleInfoMessage} - ${err.message}`,
          this.logTags
        );
        throw err;
      }
    }
  }

  public async updatePersistedAlerts({
    alertsToUpdateWithMaintenanceWindows,
    alertsToUpdateWithLastScheduledActions,
  }: {
    alertsToUpdateWithMaintenanceWindows: AlertsToUpdateWithMaintenanceWindows;
    alertsToUpdateWithLastScheduledActions: AlertsToUpdateWithLastScheduledActions;
  }) {
    const idsToUpdate = new Set([
      ...Object.keys(alertsToUpdateWithMaintenanceWindows),
      ...Object.keys(alertsToUpdateWithLastScheduledActions),
    ]);

    if (idsToUpdate.size === 0) {
      return;
    }

    try {
      const esClient = await this.options.elasticsearchClientPromise;
      await retryTransientEsErrors(
        () => {
          return esClient.updateByQuery({
            query: {
              terms: {
                _id: [...idsToUpdate],
              },
            },
            conflicts: 'proceed',
            index: this.indexTemplateAndPattern.alias,
            script: {
              source: `
                if (params.toScheduledAction.containsKey(ctx._source['${ALERT_UUID}'])) {
                  ctx._source['${ALERT_SCHEDULED_ACTION_GROUP}'] = params.toScheduledAction[ctx._source['${ALERT_UUID}']].group;
                  ctx._source['${ALERT_SCHEDULED_ACTION_DATE}'] = params.toScheduledAction[ctx._source['${ALERT_UUID}']].date;
                  if (params.toScheduledAction[ctx._source['${ALERT_UUID}']].containsKey('throttling')) {
                    ctx._source['${ALERT_SCHEDULED_ACTION_THROTTLING}'] = params.toScheduledAction[ctx._source['${ALERT_UUID}']].throttling;
                  }
                }
                if (params.toMaintenanceWindows.containsKey(ctx._source['${ALERT_UUID}'])) {
                  ctx._source['${ALERT_MAINTENANCE_WINDOW_IDS}'] = params.toMaintenanceWindows[ctx._source['${ALERT_UUID}']];
                }
              `,
              lang: 'painless',
              params: {
                toScheduledAction: alertsToUpdateWithLastScheduledActions,
                toMaintenanceWindows: alertsToUpdateWithMaintenanceWindows,
              },
            },
          });
        },
        { logger: this.options.logger }
      );
    } catch (err) {
      this.options.logger.error(
        `Error updating alerts. (last scheduled actions or maintenance windows) ${this.ruleInfoMessage}: ${err}`,
        this.logTags
      );
      throw err;
    }
  }

  private async getMaintenanceWindowScopedQueryAlerts({
    ruleId,
    spaceId,
    executionUuid,
    maintenanceWindows,
  }: GetMaintenanceWindowScopedQueryAlertsParams): Promise<ScopedQueryAlerts> {
    if (!ruleId || !spaceId || !executionUuid) {
      throw new Error(
        `Must specify rule ID, space ID, and executionUuid for scoped query AAD alert query.`
      );
    }
    const isLifecycleAlert = this.ruleType.autoRecoverAlerts ?? false;
    const maxAlertLimit = this.legacyAlertsClient.getMaxAlertLimit();

    const searches = getMaintenanceWindowAlertsQuery({
      executionUuid,
      ruleId,
      maintenanceWindows,
      action: isLifecycleAlert ? 'open' : undefined,
      maxAlertLimit,
    });

    const responses = await this.msearch(searches);
    const alertsByMaintenanceWindowIds: ScopedQueryAlerts = {};

    responses.forEach((response) => {
      if ('error' in response) {
        this.options.logger.error(
          `Error fetching scoped query alerts for maintenance windows ${this.ruleInfoMessage}: ${response.error.reason}`,
          this.logTags
        );
        return;
      }
      response.hits.hits.forEach(({ fields }) => {
        if (!fields) {
          return;
        }
        const mwIdField = fields[RUNTIME_MAINTENANCE_WINDOW_ID_FIELD];

        if (!alertsByMaintenanceWindowIds[mwIdField]) {
          alertsByMaintenanceWindowIds[mwIdField] = [];
        }

        alertsByMaintenanceWindowIds[mwIdField].push(get(fields, ALERT_UUID)[0]);
      });
    });

    return alertsByMaintenanceWindowIds;
  }

  public async getAlertsToUpdateWithMaintenanceWindows(): Promise<AlertsToUpdateWithMaintenanceWindows> {
    try {
      // check if there are any alerts
      const newAlerts = Object.values(this.legacyAlertsClient.getProcessedAlerts('new'));
      const activeAlerts = Object.values(this.legacyAlertsClient.getProcessedAlerts('active'));
      const recoveredAlerts = Object.values(
        this.legacyAlertsClient.getProcessedAlerts('recovered')
      );

      // return if there are no alerts written
      if (
        (!newAlerts.length && !activeAlerts.length && !recoveredAlerts.length) ||
        !this.options.maintenanceWindowsService
      ) {
        return {};
      }

      const { maintenanceWindows } =
        await this.options.maintenanceWindowsService.getMaintenanceWindows({
          eventLogger: this.options.alertingEventLogger,
          request: this.options.request,
          ruleTypeCategory: this.ruleType.category,
          spaceId: this.options.spaceId,
        });

      const maintenanceWindowsWithScopedQuery = filterMaintenanceWindows({
        maintenanceWindows: maintenanceWindows ?? [],
        withScopedQuery: true,
      });
      const maintenanceWindowsWithoutScopedQueryIds = filterMaintenanceWindowsIds({
        maintenanceWindows: maintenanceWindows ?? [],
        withScopedQuery: false,
      });

      // Create a map of maintenance window IDs to names
      const maintenanceWindowNamesMap = new Map(
        (maintenanceWindows ?? []).map((mw) => [mw.id, mw.title])
      );
      if (maintenanceWindowsWithScopedQuery.length === 0) {
        return {};
      }

      // Run aggs to get all scoped query alert IDs, returns a record<maintenanceWindowId, alertIds>,
      // indicating the maintenance window has matches a number of alerts with the scoped query.
      const alertsByMaintenanceWindowIds = await this.getMaintenanceWindowScopedQueryAlerts({
        ruleId: this.options.rule.id,
        spaceId: this.options.rule.spaceId,
        executionUuid: this.options.rule.executionId,
        maintenanceWindows: maintenanceWindowsWithScopedQuery,
      });

      const alertsAffectedByScopedQuery: string[] = [];
      const appliedMaintenanceWindowIds: string[] = [];

      for (const [scopedQueryMaintenanceWindowId, alertIds] of Object.entries(
        alertsByMaintenanceWindowIds
      )) {
        // Go through matched alerts, find the in memory object
        alertIds.forEach((alertId) => {
          const newAlert = newAlerts.find((alert) => alert.matchesUuid(alertId));
          if (!newAlert) {
            return;
          }

          const newMaintenanceWindowIds = [
            // Keep existing Ids
            ...newAlert.getMaintenanceWindowIds(),
            // Add the ids that don't have scoped queries
            ...maintenanceWindowsWithoutScopedQueryIds,
            // Add the scoped query id
            scopedQueryMaintenanceWindowId,
          ];

          // Get corresponding names for the maintenance window IDs
          const uniqueMaintenanceWindowIds = [...new Set(newMaintenanceWindowIds)];
          const maintenanceWindowNames = uniqueMaintenanceWindowIds.map(
            (id) => maintenanceWindowNamesMap.get(id) || id
          );

          // Update in memory alert with new maintenance window IDs and names
          newAlert.setMaintenanceWindowIds(uniqueMaintenanceWindowIds);
          newAlert.setMaintenanceWindowNames(maintenanceWindowNames);

          alertsAffectedByScopedQuery.push(alertId);
          appliedMaintenanceWindowIds.push(...newMaintenanceWindowIds);
        });
      }

      const uniqueAlertsId = [...new Set(alertsAffectedByScopedQuery)];
      const uniqueMaintenanceWindowIds = [...new Set(appliedMaintenanceWindowIds)];

      if (uniqueMaintenanceWindowIds && uniqueMaintenanceWindowIds.length > 0) {
        this.options.alertingEventLogger.setMaintenanceWindowIds(uniqueMaintenanceWindowIds);
      }

      const alertsAffectedByMaintenanceWindows: Record<string, string[]> = {};

      uniqueAlertsId.forEach((id) => {
        const newAlert = newAlerts.find((alert) => alert.matchesUuid(id));
        if (newAlert) {
          alertsAffectedByMaintenanceWindows[id] = newAlert.getMaintenanceWindowIds();
        }
      });

      return alertsAffectedByMaintenanceWindows;
    } catch (err) {
      this.options.logger.error(
        `Error getting alerts affected by maintenance windows: ${err.message}`,
        this.logTags
      );
      return {};
    }
  }

  public getAlertsToUpdateWithLastScheduledActions(): AlertsToUpdateWithLastScheduledActions {
    const { rawActiveAlerts } = this.getRawAlertInstancesForState(true);
    const result: AlertsToUpdateWithLastScheduledActions = {};
    try {
      for (const key in rawActiveAlerts) {
        if (key) {
          const { meta } = rawActiveAlerts[key];
          const uuid = meta?.uuid;
          const last = meta?.lastScheduledActions;
          if (!uuid || !last) continue;
          const { group, date, actions } = last;
          result[uuid] = actions ? { group, date, throttling: actions } : { group, date };
        }
      }
    } catch (err) {
      this.options.logger.error(
        `Error getting alerts to update with last scheduled actions: ${err.message}`,
        this.logTags
      );
    }
    return result;
  }

  public client() {
    return {
      report: (
        alert: ReportedAlert<
          AlertData,
          LegacyState,
          LegacyContext,
          WithoutReservedActionGroups<ActionGroupIds, RecoveryActionGroupId>
        >
      ) => this.report(alert),
      isTrackedAlert: (id: string) => this.isTrackedAlert(id),
      setAlertData: (
        alert: UpdateableAlert<AlertData, LegacyState, LegacyContext, RecoveryActionGroupId>
      ) => this.setAlertData(alert),
      getAlertLimitValue: (): number => this.factory().alertLimit.getValue(),
      setAlertLimitReached: (reached: boolean) =>
        this.factory().alertLimit.setLimitReached(reached),
      getRecoveredAlerts: () => {
        const { getRecoveredAlerts } = this.factory().done();
        const recoveredLegacyAlerts = getRecoveredAlerts() ?? [];
        return recoveredLegacyAlerts.map((alert) => ({
          alert,
          hit: this.trackedAlerts.get(alert.getUuid()),
        }));
      },
    };
  }

  public isUsingDataStreams(): boolean {
    return this._isUsingDataStreams;
  }

  private throwIfHasClusterBlockException(response: BulkResponse) {
    response.items.forEach((item) => {
      const op = item.create || item.index || item.update || item.delete;
      if (op?.error && op.error.type === CLUSTER_BLOCK_EXCEPTION) {
        throw new ErrorWithType({
          message: op.error.reason || 'Unknown reason',
          type: CLUSTER_BLOCK_EXCEPTION,
          stack: op.error.stack_trace,
        });
      }
    });
  }
}

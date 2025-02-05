/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';

import {
  ALERT_INSTANCE_ID,
  ALERT_RULE_UUID,
  ALERT_STATUS,
  ALERT_UUID,
  ALERT_MAINTENANCE_WINDOW_IDS,
} from '@kbn/rule-data-utils';
import { chunk, flatMap, get, isEmpty, keys } from 'lodash';
import { SearchRequest } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { Alert } from '@kbn/alerts-as-data-utils';
import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import { DeepPartial } from '@kbn/utility-types';
import { BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import { CLUSTER_BLOCK_EXCEPTION, isClusterBlockError } from '../lib/error_with_type';
import { UntypedNormalizedRuleType } from '../rule_type_registry';
import {
  SummarizedAlerts,
  ScopedQueryAlerts,
  AlertInstanceContext,
  AlertInstanceState,
  RuleAlertData,
  WithoutReservedActionGroups,
  DataStreamAdapter,
} from '../types';
import { LegacyAlertsClient } from './legacy_alerts_client';
import {
  getIndexTemplateAndPattern,
  IIndexPatternString,
} from '../alerts_service/resource_installer_utils';
import { CreateAlertsClientParams } from '../alerts_service/alerts_service';
import type { AlertRule, LogAlertsOpts, ProcessAlertsOpts, SearchResult } from './types';
import {
  IAlertsClient,
  InitializeExecutionOpts,
  TrackedAlerts,
  ReportedAlert,
  ReportedAlertData,
  UpdateableAlert,
  GetSummarizedAlertsParams,
  GetMaintenanceWindowScopedQueryAlertsParams,
  ScopedQueryAggregationResult,
} from './types';
import {
  buildNewAlert,
  buildOngoingAlert,
  buildUpdatedRecoveredAlert,
  buildRecoveredAlert,
  formatRule,
  getHitsWithCount,
  getScopedQueryHitsWithIds,
  getLifecycleAlertsQueries,
  getMaintenanceWindowAlertsQuery,
  getContinualAlertsQuery,
  isAlertImproving,
} from './lib';
import { isValidAlertIndexName } from '../alerts_service';
import { resolveAlertConflicts } from './lib/alert_conflict_resolver';
import {
  filterMaintenanceWindows,
  filterMaintenanceWindowsIds,
} from '../task_runner/maintenance_windows';
import { ErrorWithType } from '../lib/error_with_type';

// Term queries can take up to 10,000 terms
const CHUNK_SIZE = 10000;

export interface AlertsClientParams extends CreateAlertsClientParams {
  elasticsearchClientPromise: Promise<ElasticsearchClient>;
  kibanaVersion: string;
  dataStreamAdapter: DataStreamAdapter;
  isServerless: boolean;
}

interface AlertsAffectedByMaintenanceWindows {
  alertIds: string[];
  maintenanceWindowIds: string[];
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
  private fetchedAlerts: {
    indices: Record<string, string>;
    data: Record<string, Alert & AlertData>;
    seqNo: Record<string, number | undefined>;
    primaryTerm: Record<string, number | undefined>;
  };

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
    this.fetchedAlerts = { indices: {}, data: {}, seqNo: {}, primaryTerm: {} };
    this.rule = formatRule({ rule: this.options.rule, ruleType: this.options.ruleType });
    this.ruleType = options.ruleType;
    this._isUsingDataStreams = this.options.dataStreamAdapter.isUsingDataStreams();
    this.ruleInfoMessage = `for ${this.ruleType.id}:${this.options.rule.id} '${this.options.rule.name}'`;
    this.logTags = { tags: [this.ruleType.id, this.options.rule.id, 'alerts-client'] };
    this.isServerless = options.isServerless;
  }

  public async initializeExecution(opts: InitializeExecutionOpts) {
    this.startedAtString = opts.startedAt ? opts.startedAt.toISOString() : null;
    if (opts.runTimestamp) {
      this.runTimestampString = opts.runTimestamp.toISOString();
    }
    await this.legacyAlertsClient.initializeExecution(opts);

    if (!this.ruleType.alerts?.shouldWrite) {
      return;
    }
    // Get tracked alert UUIDs to query for
    // TODO - we can consider refactoring to store the previous execution UUID and query
    // for active and recovered alerts from the previous execution using that UUID
    const trackedAlerts = this.legacyAlertsClient.getTrackedAlerts();

    const uuidsToFetch: string[] = [];
    keys(trackedAlerts).forEach((key) => {
      const tkey = key as keyof TrackedAlerts<LegacyState, LegacyContext>;
      keys(trackedAlerts[tkey]).forEach((alertId: string) => {
        uuidsToFetch.push(trackedAlerts[tkey][alertId].getUuid());
      });
    });

    if (!uuidsToFetch.length) {
      return;
    }

    const queryByUuid = async (uuids: string[]) => {
      const result = await this.search({
        size: uuids.length,
        seq_no_primary_term: true,
        query: {
          bool: {
            filter: [
              {
                term: {
                  [ALERT_RULE_UUID]: this.options.rule.id,
                },
              },
              {
                terms: {
                  [ALERT_UUID]: uuids,
                },
              },
            ],
          },
        },
      });
      return result.hits;
    };

    try {
      const results = await Promise.all(
        chunk(uuidsToFetch, CHUNK_SIZE).map((uuidChunk: string[]) => queryByUuid(uuidChunk))
      );

      for (const hit of results.flat()) {
        const alertHit: Alert & AlertData = hit._source as Alert & AlertData;
        const alertUuid = get(alertHit, ALERT_UUID);
        const alertId = get(alertHit, ALERT_INSTANCE_ID);

        // Keep track of existing alert document so we can copy over data if alert is ongoing
        this.fetchedAlerts.data[alertId] = alertHit;

        // Keep track of index so we can update the correct document
        this.fetchedAlerts.indices[alertUuid] = hit._index;
        this.fetchedAlerts.seqNo[alertUuid] = hit._seq_no;
        this.fetchedAlerts.primaryTerm[alertUuid] = hit._primary_term;
      }
    } catch (err) {
      this.options.logger.error(
        `Error searching for tracked alerts by UUID ${this.ruleInfoMessage} - ${err.message}`,
        this.logTags
      );
    }
  }

  public async search<Aggregation = unknown>(
    queryBody: SearchRequest['body']
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
      body: queryBody,
      ignore_unavailable: true,
    });

    return { hits, total, aggregations };
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
      alertDoc: this.fetchedAlerts.data[alert.id],
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
    return this.legacyAlertsClient.isTrackedAlert(id);
  }

  public hasReachedAlertLimit(): boolean {
    return this.legacyAlertsClient.hasReachedAlertLimit();
  }

  public checkLimitUsage() {
    return this.legacyAlertsClient.checkLimitUsage();
  }

  public async processAlerts(opts: ProcessAlertsOpts) {
    await this.legacyAlertsClient.processAlerts(opts);
  }

  public logAlerts(opts: LogAlertsOpts) {
    this.legacyAlertsClient.logAlerts(opts);
  }

  public getProcessedAlerts(
    type: 'new' | 'active' | 'activeCurrent' | 'recovered' | 'recoveredCurrent'
  ) {
    return this.legacyAlertsClient.getProcessedAlerts(type);
  }

  public async persistAlerts(): Promise<AlertsAffectedByMaintenanceWindows> {
    // Persist alerts first
    await this.persistAlertsHelper();

    return await this.updatePersistedAlertsWithMaintenanceWindowIds();
  }

  public getAlertsToSerialize() {
    // The flapping value that is persisted inside the task manager state (and used in the next execution)
    // is different than the value that should be written to the alert document. For this reason, we call
    // getAlertsToSerialize() twice, once before building and bulk indexing alert docs and once after to return
    // the value for task state serialization

    // This will be a blocker if ever we want to stop serializing alert data inside the task state and just use
    // the fetched alert document.
    return this.legacyAlertsClient.getAlertsToSerialize();
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
    const queryByExecutionUuid: boolean = !!executionUuid;
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

  private async persistAlertsHelper() {
    if (!this.ruleType.alerts?.shouldWrite) {
      this.options.logger.debug(
        `Resources registered and installed for ${this.ruleType.alerts?.context} context but "shouldWrite" is set to false ${this.ruleInfoMessage}.`,
        this.logTags
      );
      return;
    }
    const currentTime = this.startedAtString ?? new Date().toISOString();
    const esClient = await this.options.elasticsearchClientPromise;

    const { alertsToReturn, recoveredAlertsToReturn } =
      this.legacyAlertsClient.getAlertsToSerialize(false);

    const activeAlerts = this.legacyAlertsClient.getProcessedAlerts('active');
    const currentRecoveredAlerts = this.legacyAlertsClient.getProcessedAlerts('recoveredCurrent');

    // TODO - Lifecycle alerts set some other fields based on alert status
    // Example: workflow status - default to 'open' if not set
    // event action: new alert = 'new', active alert: 'active', otherwise 'close'

    const activeAlertsToIndex: Array<Alert & AlertData> = [];
    for (const id of keys(alertsToReturn)) {
      // See if there's an existing active alert document
      if (!!activeAlerts[id]) {
        if (
          Object.hasOwn(this.fetchedAlerts.data, id) &&
          get(this.fetchedAlerts.data[id], ALERT_STATUS) === 'active'
        ) {
          const isImproving = isAlertImproving<
            AlertData,
            LegacyState,
            LegacyContext,
            ActionGroupIds,
            RecoveryActionGroupId
          >(this.fetchedAlerts.data[id], activeAlerts[id], this.ruleType.actionGroups);
          activeAlertsToIndex.push(
            buildOngoingAlert<
              AlertData,
              LegacyState,
              LegacyContext,
              ActionGroupIds,
              RecoveryActionGroupId
            >({
              alert: this.fetchedAlerts.data[id],
              legacyAlert: activeAlerts[id],
              rule: this.rule,
              isImproving,
              runTimestamp: this.runTimestampString,
              timestamp: currentTime,
              payload: this.reportedAlerts[id],
              kibanaVersion: this.options.kibanaVersion,
            })
          );
        } else {
          // skip writing the alert document if the number of consecutive
          // active alerts is less than the rule alertDelay threshold
          if (activeAlerts[id].getActiveCount() < this.options.rule.alertDelay) {
            continue;
          }
          activeAlertsToIndex.push(
            buildNewAlert<
              AlertData,
              LegacyState,
              LegacyContext,
              ActionGroupIds,
              RecoveryActionGroupId
            >({
              legacyAlert: activeAlerts[id],
              rule: this.rule,
              runTimestamp: this.runTimestampString,
              timestamp: currentTime,
              payload: this.reportedAlerts[id],
              kibanaVersion: this.options.kibanaVersion,
            })
          );
        }
      } else {
        this.options.logger.error(
          `Error writing alert(${id}) to ${this.indexTemplateAndPattern.alias} - alert(${id}) doesn't exist in active alerts ${this.ruleInfoMessage}.`,
          this.logTags
        );
      }
    }

    const recoveredAlertsToIndex: Array<Alert & AlertData> = [];
    for (const id of keys(recoveredAlertsToReturn)) {
      // See if there's an existing alert document
      // If there is not, log an error because there should be
      if (Object.hasOwn(this.fetchedAlerts.data, id)) {
        recoveredAlertsToIndex.push(
          currentRecoveredAlerts[id]
            ? buildRecoveredAlert<
                AlertData,
                LegacyState,
                LegacyContext,
                ActionGroupIds,
                RecoveryActionGroupId
              >({
                alert: this.fetchedAlerts.data[id],
                legacyAlert: currentRecoveredAlerts[id],
                rule: this.rule,
                runTimestamp: this.runTimestampString,
                timestamp: currentTime,
                payload: this.reportedAlerts[id],
                recoveryActionGroup: this.options.ruleType.recoveryActionGroup.id,
                kibanaVersion: this.options.kibanaVersion,
              })
            : buildUpdatedRecoveredAlert<AlertData>({
                alert: this.fetchedAlerts.data[id],
                legacyRawAlert: recoveredAlertsToReturn[id],
                runTimestamp: this.runTimestampString,
                timestamp: currentTime,
                rule: this.rule,
              })
        );
      }
    }

    const alertsToIndex = [...activeAlertsToIndex, ...recoveredAlertsToIndex].filter(
      (alert: Alert & AlertData) => {
        const alertUuid = get(alert, ALERT_UUID);
        const alertIndex = this.fetchedAlerts.indices[alertUuid];
        if (!alertIndex) {
          return true;
        } else if (!isValidAlertIndexName(alertIndex)) {
          this.options.logger.warn(
            `Could not update alert ${alertUuid} in ${alertIndex}. Partial and restored alert indices are not supported ${this.ruleInfoMessage}.`,
            this.logTags
          );
          return false;
        }
        return true;
      }
    );
    if (alertsToIndex.length > 0) {
      const bulkBody = flatMap(
        alertsToIndex.map((alert: Alert & AlertData) => {
          const alertUuid = get(alert, ALERT_UUID);
          return [
            getBulkMeta(
              alertUuid,
              this.fetchedAlerts.indices[alertUuid],
              this.fetchedAlerts.seqNo[alertUuid],
              this.fetchedAlerts.primaryTerm[alertUuid],
              this.isUsingDataStreams()
            ),
            alert,
          ];
        })
      );

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
        if (isClusterBlockError(err)) {
          throw err;
        }
        this.options.logger.error(
          `Error writing ${alertsToIndex.length} alerts to ${this.indexTemplateAndPattern.alias} ${this.ruleInfoMessage} - ${err.message}`,
          this.logTags
        );
      }
    }

    function getBulkMeta(
      uuid: string,
      index: string | undefined,
      seqNo: number | undefined,
      primaryTerm: number | undefined,
      isUsingDataStreams: boolean
    ) {
      if (index && seqNo != null && primaryTerm != null) {
        return {
          index: {
            _id: uuid,
            _index: index,
            if_seq_no: seqNo,
            if_primary_term: primaryTerm,
            require_alias: false,
          },
        };
      }

      return {
        create: {
          _id: uuid,
          ...(isUsingDataStreams ? {} : { require_alias: true }),
        },
      };
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

    const query = getMaintenanceWindowAlertsQuery({
      executionUuid,
      ruleId,
      maintenanceWindows,
      action: isLifecycleAlert ? 'open' : undefined,
      maxAlertLimit,
    });

    const response = await this.search<ScopedQueryAggregationResult>(query);

    return getScopedQueryHitsWithIds(response.aggregations);
  }

  private async updateAlertMaintenanceWindowIds(idsToUpdate: string[]) {
    const esClient = await this.options.elasticsearchClientPromise;
    const newAlerts = Object.values(this.legacyAlertsClient.getProcessedAlerts('new'));

    const params: Record<string, string[]> = {};

    idsToUpdate.forEach((id) => {
      const newAlert = newAlerts.find((alert) => alert.getUuid() === id);
      if (newAlert) {
        params[id] = newAlert.getMaintenanceWindowIds();
      }
    });

    try {
      const response = await esClient.updateByQuery({
        query: {
          terms: {
            _id: idsToUpdate,
          },
        },
        conflicts: 'proceed',
        index: this.indexTemplateAndPattern.alias,
        script: {
          source: `
            if (params.containsKey(ctx._source['${ALERT_UUID}'])) {
              ctx._source['${ALERT_MAINTENANCE_WINDOW_IDS}'] = params[ctx._source['${ALERT_UUID}']];
            }
          `,
          lang: 'painless',
          params,
        },
      });
      return response;
    } catch (err) {
      this.options.logger.warn(
        `Error updating alert maintenance window IDs ${this.ruleInfoMessage}: ${err}`,
        this.logTags
      );
      throw err;
    }
  }

  private async updatePersistedAlertsWithMaintenanceWindowIds(): Promise<AlertsAffectedByMaintenanceWindows> {
    // check if there are any alerts
    const newAlerts = Object.values(this.legacyAlertsClient.getProcessedAlerts('new'));
    const activeAlerts = Object.values(this.legacyAlertsClient.getProcessedAlerts('active'));
    const recoveredAlerts = Object.values(this.legacyAlertsClient.getProcessedAlerts('recovered'));

    // return if there are no alerts written
    if (
      (!newAlerts.length && !activeAlerts.length && !recoveredAlerts.length) ||
      !this.options.maintenanceWindowsService
    ) {
      return {
        alertIds: [],
        maintenanceWindowIds: [],
      };
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
    if (maintenanceWindowsWithScopedQuery.length === 0) {
      return {
        alertIds: [],
        maintenanceWindowIds: maintenanceWindowsWithoutScopedQueryIds,
      };
    }

    // Run aggs to get all scoped query alert IDs, returns a record<maintenanceWindowId, alertIds>,
    // indicating the maintenance window has matches a number of alerts with the scoped query.
    const aggsResult = await this.getMaintenanceWindowScopedQueryAlerts({
      ruleId: this.options.rule.id,
      spaceId: this.options.rule.spaceId,
      executionUuid: this.options.rule.executionId,
      maintenanceWindows: maintenanceWindowsWithScopedQuery,
    });

    const alertsAffectedByScopedQuery: string[] = [];
    const appliedMaintenanceWindowIds: string[] = [];

    for (const [scopedQueryMaintenanceWindowId, alertIds] of Object.entries(aggsResult)) {
      // Go through matched alerts, find the in memory object
      alertIds.forEach((alertId) => {
        const newAlert = newAlerts.find((alert) => alert.getUuid() === alertId);
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

        // Update in memory alert with new maintenance window IDs
        newAlert.setMaintenanceWindowIds([...new Set(newMaintenanceWindowIds)]);

        alertsAffectedByScopedQuery.push(newAlert.getUuid());
        appliedMaintenanceWindowIds.push(...newMaintenanceWindowIds);
      });
    }

    const uniqueAlertsId = [...new Set(alertsAffectedByScopedQuery)];
    const uniqueMaintenanceWindowIds = [...new Set(appliedMaintenanceWindowIds)];

    if (uniqueAlertsId.length) {
      // Update alerts with new maintenance window IDs, await not needed
      this.updateAlertMaintenanceWindowIds(uniqueAlertsId).catch(() => {
        this.options.logger.debug(
          `Failed to update new alerts with scoped query maintenance window Ids by updateByQuery ${this.ruleInfoMessage}.`,
          this.logTags
        );
      });
    }

    return {
      alertIds: uniqueAlertsId,
      maintenanceWindowIds: uniqueMaintenanceWindowIds,
    };
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
          hit: this.fetchedAlerts.data[alert.getId()],
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

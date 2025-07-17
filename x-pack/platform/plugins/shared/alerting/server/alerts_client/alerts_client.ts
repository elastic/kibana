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
  ALERT_START,
} from '@kbn/rule-data-utils';
import { flatMap, get, isEmpty, keys } from 'lodash';
import type {
  MsearchRequestItem,
  MsearchResponseItem,
  SearchRequest,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
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
import { getIndexTemplateAndPattern } from '../alerts_service/resource_installer_utils';
import type { CreateAlertsClientParams } from '../alerts_service/alerts_service';
import type { AlertRule, DetermineDelayedAlertsOpts, LogAlertsOpts, SearchResult } from './types';
import type { IIndexPatternString } from '../alerts_service/resource_installer_utils';
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
  buildNewAlert,
  buildOngoingAlert,
  buildUpdatedRecoveredAlert,
  buildRecoveredAlert,
  formatRule,
  getHitsWithCount,
  getLifecycleAlertsQueries,
  getMaintenanceWindowAlertsQuery,
  getContinualAlertsQuery,
  isAlertImproving,
  shouldCreateAlertsInAllSpaces,
} from './lib';
import { isValidAlertIndexName } from '../alerts_service';
import { resolveAlertConflicts } from './lib/alert_conflict_resolver';
import {
  filterMaintenanceWindows,
  filterMaintenanceWindowsIds,
} from '../task_runner/maintenance_windows';
import { ErrorWithType } from '../lib/error_with_type';
import { DEFAULT_MAX_ALERTS } from '../config';
import { RUNTIME_MAINTENANCE_WINDOW_ID_FIELD } from './lib/get_summarized_alerts_query';

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
  private trackedAlerts: {
    indices: Record<string, string>;
    active: Record<string, Alert & AlertData>;
    recovered: Record<string, Alert & AlertData>;
    seqNo: Record<string, number | undefined>;
    primaryTerm: Record<string, number | undefined>;
    get: (uuid: string) => Alert & AlertData;
    getById: (id: string) => (Alert & AlertData) | undefined;
  };

  private trackedExecutions: Set<string>;
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
      seqNo: {},
      primaryTerm: {},
      get(uuid: string) {
        return this.active[uuid] ?? this.recovered[uuid];
      },
      getById(id: string) {
        return (
          Object.values(this.active).find((alert) => get(alert, ALERT_INSTANCE_ID) === id) ??
          Object.values(this.recovered).find((alert) => get(alert, ALERT_INSTANCE_ID) === id)
        );
      },
    };
    this.trackedExecutions = new Set([]);
    this.rule = formatRule({ rule: this.options.rule, ruleType: this.options.ruleType });
    this.ruleType = options.ruleType;
    this._isUsingDataStreams = this.options.dataStreamAdapter.isUsingDataStreams();
    this.ruleInfoMessage = `for ${this.ruleType.id}:${this.options.rule.id} '${this.options.rule.name}'`;
    this.logTags = { tags: [this.ruleType.id, this.options.rule.id, 'alerts-client'] };
    this.isServerless = options.isServerless;
  }

  public async initializeExecution(opts: InitializeExecutionOpts) {
    this.startedAtString = opts.startedAt ? opts.startedAt.toISOString() : null;

    const { runTimestamp, trackedExecutions } = opts;

    if (runTimestamp) {
      this.runTimestampString = runTimestamp.toISOString();
    }
    await this.legacyAlertsClient.initializeExecution(opts);

    this.trackedExecutions = new Set(trackedExecutions ?? []);

    // No need to fetch the tracked alerts for the non-lifecycle rules
    if (this.ruleType.autoRecoverAlerts) {
      const getTrackedAlertsByExecutionUuids = async (executionUuids: string[]) => {
        const result = await this.search({
          size: (opts.maxAlerts || DEFAULT_MAX_ALERTS) * 2,
          seq_no_primary_term: true,
          query: {
            bool: {
              must: [{ term: { [ALERT_RULE_UUID]: this.options.rule.id } }],
              filter: [{ terms: { [ALERT_RULE_EXECUTION_UUID]: executionUuids } }],
            },
          },
        });
        return result.hits;
      };

      const getTrackedAlertsByAlertUuids = async () => {
        const { activeAlertsFromState = {}, recoveredAlertsFromState = {} } = opts;
        const uuidsToFetch: string[] = [];
        Object.values(activeAlertsFromState).forEach((activeAlert) =>
          uuidsToFetch.push(activeAlert.meta?.uuid!)
        );
        Object.values(recoveredAlertsFromState).forEach((recoveredAlert) =>
          uuidsToFetch.push(recoveredAlert.meta?.uuid!)
        );

        if (uuidsToFetch.length <= 0) {
          return [];
        }

        const result = await this.search({
          size: uuidsToFetch.length,
          seq_no_primary_term: true,
          sort: { [ALERT_START]: 'desc' },
          query: {
            bool: {
              filter: [
                { term: { [ALERT_RULE_UUID]: this.options.rule.id } },
                { terms: { [ALERT_UUID]: uuidsToFetch } },
              ],
            },
          },
        });
        return result.hits;
      };

      try {
        const results = trackedExecutions
          ? await getTrackedAlertsByExecutionUuids(Array.from(this.trackedExecutions))
          : await getTrackedAlertsByAlertUuids();

        for (const hit of results.flat()) {
          const alertHit = hit._source as Alert & AlertData;
          const alertUuid = get(alertHit, ALERT_UUID);

          if (get(alertHit, ALERT_STATUS) === ALERT_STATUS_ACTIVE) {
            this.trackedAlerts.active[alertUuid] = alertHit;
          }
          if (get(alertHit, ALERT_STATUS) === ALERT_STATUS_RECOVERED) {
            this.trackedAlerts.recovered[alertUuid] = alertHit;
          }
          this.trackedAlerts.indices[alertUuid] = hit._index;
          this.trackedAlerts.seqNo[alertUuid] = hit._seq_no;
          this.trackedAlerts.primaryTerm[alertUuid] = hit._primary_term;

          // only when the alerts are fetched by alert uuids
          if (!trackedExecutions) {
            const executionUuid = get(alertHit, ALERT_RULE_EXECUTION_UUID);
            if (executionUuid) {
              this.trackedExecutions.add(executionUuid);
            }
          }
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

  public async persistAlerts(): Promise<AlertsAffectedByMaintenanceWindows> {
    // Persist alerts first
    await this.persistAlertsHelper();
    try {
      return await this.updatePersistedAlertsWithMaintenanceWindowIds();
    } catch (err) {
      this.options.logger.error('Error updating maintenance window IDs:', err);
      return { alertIds: [], maintenanceWindowIds: [] };
    }
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

    const createAlertsInAllSpaces = shouldCreateAlertsInAllSpaces({
      ruleTypeId: this.ruleType.id,
      ruleTypeAlertDef: this.ruleType.alerts,
      logger: this.options.logger,
    });
    const { rawActiveAlerts, rawRecoveredAlerts } = this.getRawAlertInstancesForState();

    const activeAlerts = this.legacyAlertsClient.getProcessedAlerts(ALERT_STATUS_ACTIVE);
    const recoveredAlerts = this.legacyAlertsClient.getProcessedAlerts(ALERT_STATUS_RECOVERED);

    // TODO - Lifecycle alerts set some other fields based on alert status
    // Example: workflow status - default to 'open' if not set
    // event action: new alert = 'new', active alert: 'active', otherwise 'close'

    const activeAlertsToIndex: Array<Alert & AlertData> = [];
    for (const id of keys(rawActiveAlerts)) {
      // See if there's an existing active alert document
      if (activeAlerts[id]) {
        const trackedAlert = this.trackedAlerts.get(activeAlerts[id].getUuid());
        if (!!trackedAlert && get(trackedAlert, ALERT_STATUS) === ALERT_STATUS_ACTIVE) {
          const isImproving = isAlertImproving<
            AlertData,
            LegacyState,
            LegacyContext,
            ActionGroupIds,
            RecoveryActionGroupId
          >(trackedAlert, activeAlerts[id], this.ruleType.actionGroups);
          activeAlertsToIndex.push(
            buildOngoingAlert<
              AlertData,
              LegacyState,
              LegacyContext,
              ActionGroupIds,
              RecoveryActionGroupId
            >({
              alert: trackedAlert,
              legacyAlert: activeAlerts[id],
              rule: this.rule,
              isImproving,
              runTimestamp: this.runTimestampString,
              timestamp: currentTime,
              payload: this.reportedAlerts[id],
              kibanaVersion: this.options.kibanaVersion,
              dangerouslyCreateAlertsInAllSpaces: createAlertsInAllSpaces,
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
              dangerouslyCreateAlertsInAllSpaces: createAlertsInAllSpaces,
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
    for (const id of keys(rawRecoveredAlerts)) {
      const trackedAlert = this.trackedAlerts.getById(id);
      // See if there's an existing alert document
      // If there is not, log an error because there should be
      if (trackedAlert) {
        recoveredAlertsToIndex.push(
          recoveredAlerts[id]
            ? buildRecoveredAlert<
                AlertData,
                LegacyState,
                LegacyContext,
                ActionGroupIds,
                RecoveryActionGroupId
              >({
                alert: trackedAlert,
                legacyAlert: recoveredAlerts[id],
                rule: this.rule,
                runTimestamp: this.runTimestampString,
                timestamp: currentTime,
                payload: this.reportedAlerts[id],
                recoveryActionGroup: this.options.ruleType.recoveryActionGroup.id,
                kibanaVersion: this.options.kibanaVersion,
                dangerouslyCreateAlertsInAllSpaces: createAlertsInAllSpaces,
              })
            : buildUpdatedRecoveredAlert<AlertData>({
                alert: trackedAlert,
                legacyRawAlert: rawRecoveredAlerts[id],
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
        const alertIndex = this.trackedAlerts.indices[alertUuid];
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
              this.trackedAlerts.indices[alertUuid],
              this.trackedAlerts.seqNo[alertUuid],
              this.trackedAlerts.primaryTerm[alertUuid],
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
        this.options.logger.error(
          `Error writing ${alertsToIndex.length} alerts to ${this.indexTemplateAndPattern.alias} ${this.ruleInfoMessage} - ${err.message}`,
          this.logTags
        );
        throw err;
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
          hit: this.trackedAlerts.get(alert.getUuid()),
        }));
      },
    };
  }

  public isUsingDataStreams(): boolean {
    return this._isUsingDataStreams;
  }

  public getTrackedExecutions() {
    return this.trackedExecutions;
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

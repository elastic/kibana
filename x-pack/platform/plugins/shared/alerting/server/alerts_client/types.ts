/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Alert } from '@kbn/alerts-as-data-utils';
import { DeepPartial } from '@kbn/utility-types';
import { SearchResponseBody } from '@elastic/elasticsearch/lib/api/types';
import {
  ALERT_RULE_CATEGORY,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_RULE_NAME,
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_PRODUCER,
  ALERT_RULE_REVISION,
  ALERT_RULE_TAGS,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  ALERT_UUID,
  SPACE_IDS,
} from '@kbn/rule-data-utils';
import { Alert as LegacyAlert } from '../alert/alert';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertsFilter,
  SummarizedAlerts,
  RawAlertInstance,
  RuleAlertData,
  WithoutReservedActionGroups,
} from '../types';
import { AlertingEventLogger } from '../lib/alerting_event_logger/alerting_event_logger';
import { RuleRunMetricsStore } from '../lib/rule_run_metrics_store';
import { RulesSettingsFlappingProperties } from '../../common/rules_settings';
import type { PublicAlertFactory } from '../alert/create_alert_factory';
import { MaintenanceWindow } from '../application/maintenance_window/types';

export interface AlertRuleData {
  consumer: string;
  executionId: string;
  id: string;
  name: string;
  parameters: unknown;
  revision: number;
  spaceId: string;
  tags: string[];
  alertDelay: number;
}

export interface AlertRule {
  [ALERT_RULE_CATEGORY]: string;
  [ALERT_RULE_CONSUMER]: string;
  [ALERT_RULE_EXECUTION_UUID]: string;
  [ALERT_RULE_NAME]: string;
  [ALERT_RULE_PARAMETERS]: unknown;
  [ALERT_RULE_PRODUCER]: string;
  [ALERT_RULE_REVISION]: number;
  [ALERT_RULE_TYPE_ID]: string;
  [ALERT_RULE_TAGS]: string[];
  [ALERT_RULE_UUID]: string;
  [SPACE_IDS]: string[];
}

export interface IAlertsClient<
  AlertData extends RuleAlertData,
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> {
  initializeExecution(opts: InitializeExecutionOpts): Promise<void>;
  hasReachedAlertLimit(): boolean;
  checkLimitUsage(): void;
  processAlerts(opts: ProcessAlertsOpts): void;
  logAlerts(opts: LogAlertsOpts): void;
  getProcessedAlerts(
    type: 'new' | 'active' | 'activeCurrent'
  ): Record<string, LegacyAlert<State, Context, ActionGroupIds>> | {};
  getProcessedAlerts(
    type: 'recovered' | 'recoveredCurrent'
  ): Record<string, LegacyAlert<State, Context, RecoveryActionGroupId>> | {};
  persistAlerts(): Promise<{ alertIds: string[]; maintenanceWindowIds: string[] } | null>;
  isTrackedAlert(id: string): boolean;
  getSummarizedAlerts?(params: GetSummarizedAlertsParams): Promise<SummarizedAlerts>;
  getAlertsToSerialize(): {
    alertsToReturn: Record<string, RawAlertInstance>;
    recoveredAlertsToReturn: Record<string, RawAlertInstance>;
  };
  factory(): PublicAlertFactory<
    State,
    Context,
    WithoutReservedActionGroups<ActionGroupIds, RecoveryActionGroupId>
  >;
  client(): PublicAlertsClient<
    AlertData,
    State,
    Context,
    WithoutReservedActionGroups<ActionGroupIds, RecoveryActionGroupId>
  > | null;
}

export interface ProcessAndLogAlertsOpts {
  eventLogger: AlertingEventLogger;
  shouldLogAlerts: boolean;
  ruleRunMetricsStore: RuleRunMetricsStore;
  flappingSettings: RulesSettingsFlappingProperties;
  maintenanceWindowIds: string[];
  alertDelay: number;
}

export interface ProcessAlertsOpts {
  flappingSettings: RulesSettingsFlappingProperties;
  alertDelay: number;
  ruleRunMetricsStore: RuleRunMetricsStore;
}

export interface LogAlertsOpts {
  shouldLogAlerts: boolean;
  ruleRunMetricsStore: RuleRunMetricsStore;
}

export interface InitializeExecutionOpts {
  maxAlerts: number;
  ruleLabel: string;
  runTimestamp?: Date;
  startedAt: Date | null;
  flappingSettings: RulesSettingsFlappingProperties;
  activeAlertsFromState: Record<string, RawAlertInstance>;
  recoveredAlertsFromState: Record<string, RawAlertInstance>;
}

export interface TrackedAlerts<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext
> {
  active: Record<string, LegacyAlert<State, Context>>;
  recovered: Record<string, LegacyAlert<State, Context>>;
}

export interface PublicAlertsClient<
  AlertData extends RuleAlertData,
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string
> {
  report(
    alert: ReportedAlert<AlertData, State, Context, ActionGroupIds>
  ): ReportedAlertData<AlertData>;
  isTrackedAlert(id: string): boolean;
  setAlertData(alert: UpdateableAlert<AlertData, State, Context, ActionGroupIds>): void;
  getAlertLimitValue: () => number;
  setAlertLimitReached: (reached: boolean) => void;
  getRecoveredAlerts: () => Array<RecoveredAlertData<AlertData, State, Context, ActionGroupIds>>;
}

export interface ReportedAlert<
  AlertData extends RuleAlertData,
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string
> {
  id: string; // alert instance id
  actionGroup: ActionGroupIds;
  state?: State;
  context?: Context;
  payload?: DeepPartial<AlertData>;
}

export interface RecoveredAlertData<
  AlertData extends RuleAlertData,
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string
> {
  alert: LegacyAlert<State, Context, ActionGroupIds>;
  hit?: AlertData;
}

export interface ReportedAlertData<AlertData> {
  uuid: string;
  start: string | null;
  alertDoc?: AlertData;
}

export type UpdateableAlert<
  AlertData extends RuleAlertData,
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string
> = Pick<ReportedAlert<AlertData, State, Context, ActionGroupIds>, 'id' | 'context' | 'payload'>;

export interface SearchResult<AlertData, Aggregation = unknown> {
  hits: SearchResponseBody<Alert & AlertData>['hits']['hits'];
  total: SearchResponseBody<Alert & AlertData>['hits']['total'];
  aggregations: SearchResponseBody<Alert & AlertData, Aggregation>['aggregations'];
}

export type GetSummarizedAlertsParams = {
  ruleId: string;
  spaceId: string;
  excludedAlertInstanceIds: string[];
  alertsFilter?: AlertsFilter | null;
} & (
  | { start: Date; end: Date; executionUuid?: never }
  | { executionUuid: string; start?: never; end?: never }
);

export interface GetMaintenanceWindowScopedQueryAlertsParams {
  ruleId: string;
  spaceId: string;
  maintenanceWindows: MaintenanceWindow[];
  executionUuid: string;
}

export type UpdateAlertsMaintenanceWindowIdByScopedQueryParams =
  GetMaintenanceWindowScopedQueryAlertsParams;

export type GetAlertsQueryParams = Omit<
  GetSummarizedAlertsParams,
  'formatAlert' | 'isLifecycleAlert' | 'spaceId'
> & { maxAlertLimit: number };

export interface GetLifecycleAlertsQueryByExecutionUuidParams {
  executionUuid: string;
  ruleId: string;
  excludedAlertInstanceIds: string[];
  maxAlertLimit: number;
  alertsFilter?: AlertsFilter | null;
}

export interface GetQueryByExecutionUuidParams
  extends GetLifecycleAlertsQueryByExecutionUuidParams {
  action?: string;
}

export interface GetQueryByScopedQueriesParams {
  ruleId: string;
  executionUuid: string;
  maintenanceWindows: MaintenanceWindow[];
  maxAlertLimit: number;
  action?: string;
}

export interface GetMaintenanceWindowAlertsQueryParams {
  ruleId: string;
  maintenanceWindows: MaintenanceWindow[];
  executionUuid: string;
  maxAlertLimit: number;
  action?: string;
}

export interface GetLifecycleAlertsQueryByTimeRangeParams {
  start: Date;
  end: Date;
  ruleId: string;
  excludedAlertInstanceIds: string[];
  maxAlertLimit: number;
  alertsFilter?: AlertsFilter | null;
}

export interface GetQueryByTimeRangeParams<AlertTypes>
  extends GetLifecycleAlertsQueryByTimeRangeParams {
  type?: AlertTypes;
}

export type ScopedQueryAggregationResult = Record<
  string,
  {
    doc_count: number;
    alertId: {
      hits: {
        hits: Array<{
          _id: string;
          _source: {
            [ALERT_UUID]: string;
          };
        }>;
      };
    };
  }
>;

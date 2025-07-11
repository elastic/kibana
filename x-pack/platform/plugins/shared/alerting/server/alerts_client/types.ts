/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Alert } from '@kbn/alerts-as-data-utils';
import type { DeepPartial } from '@kbn/utility-types';
import type { SearchResponseBody } from '@elastic/elasticsearch/lib/api/types';
import type {
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
import type { Alert as LegacyAlert } from '../alert/alert';
import type {
  AlertInstanceContext as Context,
  AlertInstanceState as State,
  AlertsFilter,
  SummarizedAlerts,
  RawAlertInstance,
  RuleAlertData as AlertData,
  WithoutReservedActionGroups,
} from '../types';
import type { AlertingEventLogger } from '../lib/alerting_event_logger/alerting_event_logger';
import type { RuleRunMetricsStore } from '../lib/rule_run_metrics_store';
import type { RulesSettingsFlappingProperties } from '../../common/rules_settings';
import type { PublicAlertFactory } from '../alert/create_alert_factory';
import type { MaintenanceWindow } from '../application/maintenance_window/types';

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
  A extends AlertData,
  S extends State,
  C extends Context,
  G extends string,
  R extends string
> {
  initializeExecution(opts: InitializeExecutionOpts): Promise<void>;
  hasReachedAlertLimit(): boolean;
  checkLimitUsage(): void;
  processAlerts(shouldLogAlerts: boolean): void;
  getProcessedAlerts(
    type: 'new' | 'active' | 'trackedActiveAlerts'
  ): Record<string, LegacyAlert<S, C, G>> | {};
  getProcessedAlerts(
    type: 'recovered' | 'trackedRecoveredAlerts'
  ): Record<string, LegacyAlert<S, C, R>> | {};
  persistAlerts(): Promise<{ alertIds: string[]; maintenanceWindowIds: string[] } | null>;
  isTrackedAlert(id: string): boolean;
  getSummarizedAlerts?(params: GetSummarizedAlertsParams): Promise<SummarizedAlerts>;
  getRawAlertInstancesForState(shouldOptimizeTaskState?: boolean): {
    rawActiveAlerts: Map<string, RawAlertInstance>;
    rawRecoveredAlerts: Map<string, RawAlertInstance>;
  };
  factory(): PublicAlertFactory<S, C, WithoutReservedActionGroups<G, R>>;
  client(): PublicAlertsClient<A, S, C, WithoutReservedActionGroups<G, R>> | null;
  getTrackedExecutions(): Set<string>;
}

export interface ProcessAndLogAlertsOpts {
  eventLogger: AlertingEventLogger;
  shouldLogAlerts: boolean;
  ruleRunMetricsStore: RuleRunMetricsStore;
  flappingSettings: RulesSettingsFlappingProperties;
  maintenanceWindowIds: string[];
  alertDelay: number;
}

export interface DetermineDelayedAlertsOpts {
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
  trackedExecutions?: string[];
}

export interface TrackedAlerts<S extends State, C extends Context> {
  active: Map<string, LegacyAlert<S, C>>;
  recovered: Map<string, LegacyAlert<S, C>>;
}

export interface PublicAlertsClient<
  A extends AlertData,
  S extends State,
  C extends Context,
  G extends string
> {
  report(alert: ReportedAlert<A, S, C, G>): ReportedAlertData<A>;
  isTrackedAlert(id: string): boolean;
  setAlertData(alert: UpdateableAlert<A, S, C, G>): void;
  getAlertLimitValue: () => number;
  setAlertLimitReached: (reached: boolean) => void;
  getRecoveredAlerts: () => Array<RecoveredAlertData<A, S, C, G>>;
}

export interface ReportedAlert<
  A extends AlertData,
  S extends State,
  C extends Context,
  G extends string
> {
  id: string; // alert instance id
  actionGroup: G;
  state?: S;
  context?: C;
  payload?: DeepPartial<A>;
}

export interface RecoveredAlertData<
  A extends AlertData,
  S extends State,
  C extends Context,
  G extends string
> {
  alert: LegacyAlert<S, C, G>;
  hit?: A;
}

export interface ReportedAlertData<A> {
  uuid: string;
  start: string | null;
  alertDoc?: A;
}

export type UpdateableAlert<
  A extends AlertData,
  S extends State,
  C extends Context,
  G extends string
> = Pick<ReportedAlert<A, S, C, G>, 'id' | 'context' | 'payload'>;

export interface SearchResult<A, Aggregation = unknown> {
  hits: SearchResponseBody<Alert & A>['hits']['hits'];
  total: SearchResponseBody<Alert & A>['hits']['total'];
  aggregations: SearchResponseBody<Alert & A, Aggregation>['aggregations'];
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

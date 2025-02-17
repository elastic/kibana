/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Logger,
  KibanaRequest,
  IBasePath,
  ExecutionContextStart,
  SavedObjectsServiceStart,
  ElasticsearchServiceStart,
  UiSettingsServiceStart,
} from '@kbn/core/server';
import { ConcreteTaskInstance, DecoratedError } from '@kbn/task-manager-plugin/server';
import { PublicMethodsOf } from '@kbn/utility-types';
import { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import { ActionsClient } from '@kbn/actions-plugin/server/actions_client';
import { PluginStart as DataPluginStart } from '@kbn/data-plugin/server';
import { PluginStart as DataViewsPluginStart } from '@kbn/data-views-plugin/server';
import { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { IEventLogClient, IEventLogger } from '@kbn/event-log-plugin/server';
import { SharePluginStart } from '@kbn/share-plugin/server';
import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { IAlertsClient } from '../alerts_client/types';
import { Alert } from '../alert';
import { AlertsService } from '../alerts_service/alerts_service';
import {
  AlertInstanceContext,
  AlertInstanceState,
  RuleTypeParams,
  IntervalSchedule,
  RuleMonitoring,
  RuleTaskState,
  SanitizedRule,
  RuleTypeState,
  RuleAction,
  RuleAlertData,
  RuleSystemAction,
  RulesSettingsFlappingProperties,
} from '../../common';
import { ActionsConfigMap } from '../lib/get_actions_config_map';
import { NormalizedRuleType } from '../rule_type_registry';
import {
  CombinedSummarizedAlerts,
  RawRule,
  RuleTypeRegistry,
  SpaceIdToNamespaceFunction,
} from '../types';
import { RuleRunMetrics, RuleRunMetricsStore } from '../lib/rule_run_metrics_store';
import { AlertingEventLogger } from '../lib/alerting_event_logger/alerting_event_logger';
import { BackfillClient } from '../backfill_client/backfill_client';
import { ElasticsearchError } from '../lib';
import { ConnectorAdapterRegistry } from '../connector_adapters/connector_adapter_registry';
import { RulesSettingsService } from '../rules_settings';
import { MaintenanceWindowsService } from './maintenance_windows';

export interface RuleTaskRunResult {
  state: RuleTaskState;
  monitoring: RuleMonitoring | undefined;
  schedule: IntervalSchedule | undefined;
  taskRunError?: DecoratedError;
}

// This is the state of the alerting task after rule execution, which includes run metrics plus the task state
export type RuleTaskStateAndMetrics = RuleTaskState & {
  metrics: RuleRunMetrics;
};

export interface RunRuleParams<Params extends RuleTypeParams> {
  apiKey: RawRule['apiKey'];
  fakeRequest: KibanaRequest;
  rule: SanitizedRule<Params>;
  validatedParams: Params;
  version: string | undefined;
}

export interface RuleTaskInstance extends ConcreteTaskInstance {
  state: RuleTaskState;
}

// ActionScheduler
export interface ActionSchedulerOptions<
  Params extends RuleTypeParams,
  ExtractedParams extends RuleTypeParams,
  RuleState extends RuleTypeState,
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string,
  AlertData extends RuleAlertData
> {
  ruleType: NormalizedRuleType<
    Params,
    ExtractedParams,
    RuleState,
    State,
    Context,
    ActionGroupIds,
    RecoveryActionGroupId,
    AlertData
  >;
  logger: Logger;
  alertingEventLogger: PublicMethodsOf<AlertingEventLogger>;
  rule: SanitizedRule<Params>;
  taskRunnerContext: TaskRunnerContext;
  taskInstance: RuleTaskInstance;
  ruleRunMetricsStore: RuleRunMetricsStore;
  apiKey: RawRule['apiKey'];
  ruleConsumer: string;
  executionId: string;
  ruleLabel: string;
  previousStartedAt: Date | null;
  actionsClient: PublicMethodsOf<ActionsClient>;
  alertsClient: IAlertsClient<AlertData, State, Context, ActionGroupIds, RecoveryActionGroupId>;
}

export type Executable<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> = {
  action: RuleAction | RuleSystemAction;
} & (
  | {
      alert: Alert<State, Context, ActionGroupIds | RecoveryActionGroupId>;
      summarizedAlerts?: never;
    }
  | {
      alert?: never;
      summarizedAlerts: CombinedSummarizedAlerts;
    }
);

export interface RuleTypeRunnerContext {
  alertingEventLogger: AlertingEventLogger;
  flappingSettings?: RulesSettingsFlappingProperties;
  maintenanceWindowsService?: MaintenanceWindowsService;
  namespace?: string;
  queryDelaySec?: number;
  request: KibanaRequest;
  ruleId: string;
  ruleLogPrefix: string;
  ruleRunMetricsStore: RuleRunMetricsStore;
  spaceId: string;
  isServerless: boolean;
}

export interface RuleRunnerErrorStackTraceLog {
  message: ElasticsearchError;
  stackTrace?: string;
}

export interface TaskRunnerContext {
  actionsConfigMap: ActionsConfigMap;
  actionsPlugin: ActionsPluginStartContract;
  alertsService: AlertsService | null;
  backfillClient: BackfillClient;
  basePathService: IBasePath;
  cancelAlertsOnRuleTimeout: boolean;
  connectorAdapterRegistry: ConnectorAdapterRegistry;
  data: DataPluginStart;
  dataViews: DataViewsPluginStart;
  elasticsearch: ElasticsearchServiceStart;
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  eventLogger: IEventLogger;
  executionContext: ExecutionContextStart;
  kibanaBaseUrl: string | undefined;
  logger: Logger;
  maintenanceWindowsService: MaintenanceWindowsService;
  maxAlerts: number;
  ruleTypeRegistry: RuleTypeRegistry;
  rulesSettingsService: RulesSettingsService;
  savedObjects: SavedObjectsServiceStart;
  share: SharePluginStart;
  spaceIdToNamespace: SpaceIdToNamespaceFunction;
  uiSettings: UiSettingsServiceStart;
  usageCounter?: UsageCounter;
  getEventLogClient: (request: KibanaRequest) => IEventLogClient;
  isServerless: boolean;
}

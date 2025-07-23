/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ActionsClient } from '@kbn/actions-plugin/server/actions_client';
import type { ExecuteOptions as EnqueueExecutionOptions } from '@kbn/actions-plugin/server/create_execute_function';
import type { TaskPriority } from '@kbn/task-manager-plugin/server';
import type { IAlertsClient } from '../../alerts_client/types';
import type { Alert } from '../../alert';
import type {
  AlertInstanceContext,
  AlertInstanceState,
  RuleTypeParams,
  SanitizedRule,
  RuleTypeState,
  RuleAction,
  RuleAlertData,
  RuleSystemAction,
  ThrottledActions,
} from '../../../common';
import type { NormalizedRuleType } from '../../rule_type_registry';
import type { CombinedSummarizedAlerts, RawRule } from '../../types';
import type { RuleRunMetricsStore } from '../../lib/rule_run_metrics_store';
import type {
  ActionOpts,
  AlertingEventLogger,
} from '../../lib/alerting_event_logger/alerting_event_logger';
import type { RuleTaskInstance, TaskRunnerContext } from '../types';
import type { AlertsResult } from '../../alerts_client/types';

export type ActionSchedulerRule<Params extends RuleTypeParams> = Omit<
  SanitizedRule<Params>,
  'executionStatus'
>;
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
  actionsClient: PublicMethodsOf<ActionsClient>;
  alertingEventLogger: PublicMethodsOf<AlertingEventLogger>;
  alertsClient: IAlertsClient<AlertData, State, Context, ActionGroupIds, RecoveryActionGroupId>;
  apiKey: RawRule['apiKey'];
  apiKeyId?: string;
  canGetSummarizedAlerts?: boolean;
  executionId: string;
  logger: Logger;
  previousStartedAt: Date | null;
  priority?: TaskPriority;
  rule: ActionSchedulerRule<Params>;
  ruleConsumer: string;
  ruleLabel: string;
  ruleRunMetricsStore: RuleRunMetricsStore;
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
  taskInstance: RuleTaskInstance;
  taskRunnerContext: TaskRunnerContext;
  throttledSummaryActions?: ThrottledActions;
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

export interface GetActionsToScheduleOpts<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> {
  activeAlerts?: Record<string, Alert<State, Context, ActionGroupIds>>;
  recoveredAlerts?: Record<string, Alert<State, Context, RecoveryActionGroupId>>;
  throttledSummaryActions?: ThrottledActions;
}

export interface ActionsToSchedule {
  actionToEnqueue: EnqueueExecutionOptions;
  actionToLog: ActionOpts;
}

export interface IActionScheduler<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> {
  get priority(): number;
  getActionsToSchedule(
    alerts: AlertsResult<State, Context, ActionGroupIds>
  ): Promise<ActionsToSchedule[]>;
}

export interface RuleUrl {
  absoluteUrl?: string;
  kibanaBaseUrl?: string;
  basePathname?: string;
  spaceIdSegment?: string;
  relativePath?: string;
}

export interface IsExecutableAlertOpts<
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> {
  alert: Alert<AlertInstanceState, AlertInstanceContext, ActionGroupIds | RecoveryActionGroupId>;
  action: RuleAction;
  summarizedAlerts: CombinedSummarizedAlerts | null;
}

export interface IsExecutableActiveAlertOpts<ActionGroupIds extends string> {
  alert: Alert<AlertInstanceState, AlertInstanceContext, ActionGroupIds>;
  action: RuleAction;
}

export interface HelperOpts<ActionGroupIds extends string, RecoveryActionGroupId extends string> {
  alert: Alert<AlertInstanceState, AlertInstanceContext, ActionGroupIds | RecoveryActionGroupId>;
  action: RuleAction;
}

export interface AddSummarizedAlertsOpts<
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> {
  alert: Alert<AlertInstanceState, AlertInstanceContext, ActionGroupIds | RecoveryActionGroupId>;
  summarizedAlerts: CombinedSummarizedAlerts | null;
}

export type RuleActionWithSummary = RuleAction & {
  summarizedAlerts?: CombinedSummarizedAlerts;
};

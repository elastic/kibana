/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectAttributes } from '@kbn/core/server';

import type {
  SanitizedRule,
  RuleLastRunOutcomes,
  AlertsFilterTimeframe,
  RuleAction,
  RuleSystemAction,
  RuleActionParam,
} from '@kbn/alerting-types';

export type {
  ActionVariable,
  Rule,
  SanitizedRule,
  RuleTypeParams,
  RuleActionParams,
  RuleActionParam,
  IntervalSchedule,
  RuleActionFrequency,
  AlertsFilterTimeframe,
  AlertsFilter,
  RuleAction,
  RuleSystemAction,
  MappedParamsProperties,
  MappedParams,
  RuleExecutionStatuses,
  RuleLastRunOutcomes,
  RuleExecutionStatus,
  RuleMonitoringHistory,
  RuleMonitoringCalculatedMetrics,
  RuleMonitoringLastRun,
  RuleMonitoring,
  RuleLastRun,
  AlertDelay,
  SanitizedAlertsFilter,
  SanitizedRuleAction,
  AlertsHealth,
  AlertingFrameworkHealth,
  ResolvedSanitizedRule,
} from '@kbn/alerting-types';

export {
  RuleExecutionStatusValues,
  RuleLastRunOutcomeValues,
  RuleExecutionStatusErrorReasons,
  RuleExecutionStatusWarningReasons,
  HealthStatus,
} from '@kbn/alerting-types';

export type RuleTypeState = Record<string, unknown>;
export type RuleTypeMetaData = Record<string, unknown>;

// rule type defined alert fields to persist in alerts index
export type RuleAlertData = Record<string, unknown>;

export const RuleLastRunOutcomeOrderMap: Record<RuleLastRunOutcomes, number> = {
  succeeded: 0,
  warning: 10,
  failed: 20,
};

export type RuleAlertingOutcome = 'failure' | 'success' | 'unknown' | 'warning';

export type RuleActionAlertsFilterProperty = AlertsFilterTimeframe | RuleActionParam;

export type RuleActionKey = keyof RuleAction;
export type RuleSystemActionKey = keyof RuleSystemAction;

export type SanitizedRuleConfig = Pick<
  SanitizedRule,
  | 'id'
  | 'name'
  | 'tags'
  | 'consumer'
  | 'enabled'
  | 'schedule'
  | 'actions'
  | 'createdBy'
  | 'updatedBy'
  | 'createdAt'
  | 'updatedAt'
  | 'throttle'
  | 'notifyWhen'
  | 'muteAll'
  | 'revision'
  | 'snoozeSchedule'
  | 'alertDelay'
> & {
  producer: string;
  ruleTypeId: string;
  ruleTypeName: string;
};

export interface RuleMonitoringLastRunMetrics extends SavedObjectAttributes {
  duration?: number;
  total_search_duration_ms?: number | null;
  total_indexing_duration_ms?: number | null;
  total_alerts_detected?: number | null;
  total_alerts_created?: number | null;
  gap_duration_s?: number | null;
  gap_range?: {
    lte: string;
    gte: string;
  } | null;
}

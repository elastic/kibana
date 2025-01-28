/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: https://github.com/elastic/kibana/issues/110895

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
  RuleTypeState,
  RuleTypeMetaData,
  RuleAlertData,
  RuleAlertingOutcome,
  RuleActionAlertsFilterProperty,
  RuleActionKey,
  RuleSystemActionKey,
  SanitizedRuleConfig,
  RuleMonitoringLastRunMetrics,
} from './rule';
export {
  RuleExecutionStatusValues,
  RuleLastRunOutcomeValues,
  RuleExecutionStatusErrorReasons,
  RuleExecutionStatusWarningReasons,
  HealthStatus,
  RuleLastRunOutcomeOrderMap,
} from './rule';
export type {
  RulesSettingsModificationMetadata,
  RulesSettingsFlappingProperties,
  RulesSettingsQueryDelayProperties,
  RuleSpecificFlappingProperties,
  RulesSettingsFlapping,
  RulesSettingsQueryDelay,
  RulesSettingsProperties,
  RulesSettings,
} from './rules_settings';
export {
  MIN_LOOK_BACK_WINDOW,
  MAX_LOOK_BACK_WINDOW,
  MIN_STATUS_CHANGE_THRESHOLD,
  MAX_STATUS_CHANGE_THRESHOLD,
  MIN_QUERY_DELAY,
  MAX_QUERY_DELAY,
  RULES_SETTINGS_FEATURE_ID,
  ALL_FLAPPING_SETTINGS_SUB_FEATURE_ID,
  READ_FLAPPING_SETTINGS_SUB_FEATURE_ID,
  ALL_QUERY_DELAY_SETTINGS_SUB_FEATURE_ID,
  READ_QUERY_DELAY_SETTINGS_SUB_FEATURE_ID,
  API_PRIVILEGES,
  RULES_SETTINGS_SAVED_OBJECT_TYPE,
  RULES_SETTINGS_FLAPPING_SAVED_OBJECT_ID,
  RULES_SETTINGS_QUERY_DELAY_SAVED_OBJECT_ID,
  DEFAULT_LOOK_BACK_WINDOW,
  DEFAULT_STATUS_CHANGE_THRESHOLD,
  DEFAULT_QUERY_DELAY,
  DEFAULT_SERVERLESS_QUERY_DELAY,
  DEFAULT_FLAPPING_SETTINGS,
  DISABLE_FLAPPING_SETTINGS,
  DEFAULT_QUERY_DELAY_SETTINGS,
  DEFAULT_SERVERLESS_QUERY_DELAY_SETTINGS,
} from './rules_settings';
export type { RuleType, ActionGroup, ActionGroupIdsOf } from './rule_type';
export { validateBackfillSchedule } from './lib';
export type {
  ThrottledActions,
  LastScheduledActions,
  AlertInstanceMeta,
  AlertInstanceState,
  AlertInstanceContext,
  RawAlertInstance,
  TrackedLifecycleAlertState,
  WrappedLifecycleRuleState,
  RuleTaskState,
  RuleTaskParams,
} from '@kbn/alerting-state-types';
export type {
  RuleStatusValues,
  AlertStatusValues,
  ExecutionDuration,
  AlertSummary,
  AlertStatus,
} from './alert_summary';
export type {
  ReservedActionGroups,
  WithoutReservedActionGroups,
  RecoveredActionGroupId,
  DefaultActionGroupId,
} from './builtin_action_groups';
export { getBuiltinActionGroups, RecoveredActionGroup } from './builtin_action_groups';
export type { BulkEditSkipReason, BulkActionSkipResult } from './bulk_edit';
export {
  DisabledActionTypeIdsForActionGroup,
  isActionGroupDisabledForActionTypeId,
} from './disabled_action_groups';
export type { RuleNotifyWhenType } from './rule_notify_when_type';
export {
  validateNotifyWhenType,
  RuleNotifyWhenTypeValues,
  RuleNotifyWhen,
} from './rule_notify_when_type';
export {
  parseDuration,
  formatDuration,
  convertDurationToFrequency,
  getDurationNumberInItsUnit,
  getDurationUnitValue,
  validateDurationSchema,
} from './parse_duration';
export type {
  ExecutionLogSortFields,
  ActionErrorLogSortFields,
  IExecutionLog,
  IExecutionErrors,
  IExecutionErrorsResult,
  IExecutionLogResult,
  IExecutionKPIResult,
} from './execution_log_types';
export {
  executionLogSortableColumns,
  actionErrorLogSortableColumns,
  EMPTY_EXECUTION_KPI_RESULT,
} from './execution_log_types';
export type { RuleSnoozeSchedule, RuleSnooze } from './rule_snooze_type';
export type { RRuleParams, RRuleRecord } from './rrule_type';
export type {
  RuleTagsAggregationOptions,
  RuleTagsAggregationFormattedResult,
  RuleTagsAggregationResult,
} from './rule_tags_aggregation';
export { getRuleTagsAggregation, formatRuleTagsAggregationResult } from './rule_tags_aggregation';
export type { IsoWeekday } from './iso_weekdays';
export { ISO_WEEKDAYS } from './iso_weekdays';
export { alertMappings } from './saved_objects/rules/mappings';
export {
  getRuleCircuitBreakerErrorMessage,
  parseRuleCircuitBreakerErrorMessage,
} from './rule_circuit_breaker_error_message';
export {
  getScopedQueryErrorMessage,
  isScopedQueryError,
} from './maintenance_window_scoped_query_error_message';
export {
  preconfiguredConnectorActionRefPrefix,
  systemConnectorActionRefPrefix,
} from './action_ref_prefix';
export { gapStatus } from './constants';

export type {
  MaintenanceWindowModificationMetadata,
  DateRange,
  MaintenanceWindowSOProperties,
  MaintenanceWindowSOAttributes,
  MaintenanceWindow,
  MaintenanceWindowCreateBody,
  MaintenanceWindowClientContext,
  MaintenanceWindowDeepLinkIds,
  ScopedQueryAttributes,
} from './maintenance_window';

export {
  MaintenanceWindowStatus,
  MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
  MAINTENANCE_WINDOW_FEATURE_ID,
  MAINTENANCE_WINDOW_API_PRIVILEGES,
  MAINTENANCE_WINDOWS_APP_ID,
  MANAGEMENT_APP_ID,
  MAINTENANCE_WINDOW_PATHS,
  MAINTENANCE_WINDOW_DEEP_LINK_IDS,
  MAINTENANCE_WINDOW_DATE_FORMAT,
  MAINTENANCE_WINDOW_DEFAULT_PER_PAGE,
  MAINTENANCE_WINDOW_DEFAULT_TABLE_ACTIVE_PAGE,
} from './maintenance_window';

export {
  mappingFromFieldMap,
  getComponentTemplateFromFieldMap,
  contextToSchemaName,
} from './alert_schema';

export const LEGACY_BASE_ALERT_API_PATH = '/api/alerts';
export const BASE_ALERTING_API_PATH = '/api/alerting';
export const INTERNAL_BASE_ALERTING_API_PATH = '/internal/alerting' as const;
export const INTERNAL_ALERTING_SNOOZE_RULE =
  `${INTERNAL_BASE_ALERTING_API_PATH}/rule/{id}/_snooze` as const;
export const INTERNAL_ALERTING_API_FIND_RULES_PATH =
  `${INTERNAL_BASE_ALERTING_API_PATH}/rules/_find` as const;

export const INTERNAL_ALERTING_API_MAINTENANCE_WINDOW_PATH =
  `${INTERNAL_BASE_ALERTING_API_PATH}/rules/maintenance_window` as const;
export const INTERNAL_ALERTING_API_GET_ACTIVE_MAINTENANCE_WINDOWS_PATH =
  `${INTERNAL_ALERTING_API_MAINTENANCE_WINDOW_PATH}/_active` as const;

export const INTERNAL_ALERTING_BACKFILL_API_PATH =
  `${INTERNAL_BASE_ALERTING_API_PATH}/rules/backfill` as const;
export const INTERNAL_ALERTING_BACKFILL_FIND_API_PATH =
  `${INTERNAL_ALERTING_BACKFILL_API_PATH}/_find` as const;
export const INTERNAL_ALERTING_BACKFILL_SCHEDULE_API_PATH =
  `${INTERNAL_ALERTING_BACKFILL_API_PATH}/_schedule` as const;

export const INTERNAL_ALERTING_GAPS_API_PATH =
  `${INTERNAL_BASE_ALERTING_API_PATH}/rules/gaps` as const;

export const INTERNAL_ALERTING_GAPS_FIND_API_PATH =
  `${INTERNAL_ALERTING_GAPS_API_PATH}/_find` as const;

export const INTERNAL_ALERTING_GAPS_GET_RULES_API_PATH =
  `${INTERNAL_ALERTING_GAPS_API_PATH}/_get_rules` as const;

export const INTERNAL_ALERTING_GAPS_GET_SUMMARY_BY_RULE_IDS_API_PATH =
  `${INTERNAL_ALERTING_GAPS_API_PATH}/_get_gaps_summary_by_rule_ids` as const;

export const INTERNAL_ALERTING_GAPS_FILL_BY_ID_API_PATH =
  `${INTERNAL_ALERTING_GAPS_API_PATH}/_fill_by_id` as const;

export const ALERTING_FEATURE_ID = 'alerts';
export const MONITORING_HISTORY_LIMIT = 200;
export const ENABLE_MAINTENANCE_WINDOWS = true;

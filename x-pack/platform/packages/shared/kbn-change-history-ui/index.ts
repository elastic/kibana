/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type * from './src/types';
export { createChangeHistoryHttpAdapter } from './src/adapters';
export type { ChangeHistoryHttpAdapterConfig } from './src/adapters';
export { DEFAULT_CHANGE_HISTORY_PAGE_SIZE } from './src/types';
export {
  ChangeHistoryModal,
  ChangeHistoryTrigger,
  ChangeHistoryListGroupItem,
  ChangeHistoryRestoreButton,
  ChangeHistoryDefaultPreviewHeaderActions,
} from './src/components/modal';
export type {
  ChangeHistoryRestoreButtonProps,
  ChangeHistoryDefaultPreviewHeaderActionsProps,
  ChangeHistoryTriggerProps,
  ChangeHistoryListGroupItemProps,
} from './src/components/modal';
export {
  ChangeHistoryTimeline,
  ChangeHistoryItem,
  ChangeHistoryFooter,
  ChangeHistoryActionBadge,
  ChangeHistoryEmptyPrompt,
  ChangeHistoryItemComment,
  ChangeHistoryListTimestamp,
} from './src/components/timeline';
export type {
  ChangeHistoryTimelineProps,
  ChangeHistoryItemProps,
  ChangeHistoryFooterProps,
  ChangeHistoryListTimestampProps,
} from './src/components/timeline';
export {
  ChangeHistoryModalContext,
  ChangeHistoryProvider,
  useChangeHistoryConfig,
  useChangeHistoryModal,
  resolveChangeHistorySupports,
} from './src/provider';
export type {
  ChangeHistoryProviderProps,
  ChangeHistoryConfigValue,
  ChangeHistoryModalContextValue,
  ResolveChangeHistorySupportsOptions,
} from './src/provider';
export {
  useChangeHistoryList,
  useChangeHistoryDetail,
  useChangeHistoryRestore,
  useInvalidateChangeHistory,
  useChangeHistoryAutoSelection,
  CHANGE_HISTORY_QUERY_KEY,
  changeHistoryObjectQueryKeyPrefix,
  changeHistoryListQueryKey,
  changeHistoryDetailQueryKey,
  changeHistoryScopeQueryKeyPrefix,
} from './src/hooks';
export {
  getChangeHistoryErrorCode,
  getChangeHistoryErrorCodeFromBody,
} from './src/utils/get_change_history_error_code';
export { getChangeHistoryErrorMessage } from './src/utils/get_change_history_error_message';
export { isChangeHistoryErrorCode } from './src/utils/change_history_error_codes';
export { mapChangeHistoryHttpError } from './src/utils/map_change_history_http_error';
export type {
  UseChangeHistoryListArgs,
  UseChangeHistoryListResult,
  UseChangeHistoryDetailArgs,
  UseChangeHistoryDetailResult,
  UseChangeHistoryRestoreArgs,
  UseChangeHistoryRestoreResult,
  UseChangeHistoryAutoSelectionArgs,
  UseChangeHistoryAutoSelectionResult,
} from './src/hooks';
export {
  changeHistoryTelemetryEvents,
  changeHistoryTelemetryEventNames,
  changeHistoryTelemetryEventSchemas,
  ChangeHistoryTelemetryEventTypes,
  createChangeHistoryTelemetryReporter,
  registerChangeHistoryTelemetryEvents,
} from './src/telemetry';
export type {
  ChangeHistoryCompareMode,
  ChangeHistoryComparisonType,
  ChangeHistoryDiffNavigationSource,
  ChangeHistoryFilterType,
  ChangeHistoryScope,
  ChangeHistorySelectionSource,
  ChangeHistoryTelemetryEvent,
  ChangeHistoryTelemetryEventType,
  ChangeHistoryTelemetryEventsMap,
  ChangeHistoryTelemetryReporter,
  ChangeHistoryTelemetryScopeFields,
  CreateChangeHistoryTelemetryReporterOptions,
  ReportChangeHistoryChangeSelectedActionParams,
  ReportChangeHistoryDiffChangeNavigatedActionParams,
  ReportChangeHistoryDiffViewedActionParams,
  ReportChangeHistoryFilterAppliedActionParams,
  ReportChangeHistoryOpenedActionParams,
  ReportChangeHistoryRestoreCompletedActionParams,
  ReportChangeHistoryRestoreConfirmedActionParams,
  ReportChangeHistoryRestoreFailedActionParams,
} from './src/telemetry';

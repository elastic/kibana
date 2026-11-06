/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { FlyoutShell } from './flyout_shell';
export type { FlyoutShellProps } from './flyout_shell';
export { useDebouncedOnChangeEmit } from './use_debounced_on_change_emit';
export type { UseDebouncedOnChangeEmitArgs } from './use_debounced_on_change_emit';
export type { DataPhasesFlyoutCommonProps, EditDataPhasesFlyoutChangeMeta } from './types';
export { useDataPhasesFlyoutStyles } from './use_data_phases_flyout_styles';
export { useBlurCommitDraft } from './use_blur_commit_draft';
export { syncSelectedPhase } from './sync_selected_phase';
export type { SyncSelectedPhaseResult } from './sync_selected_phase';
export { PhaseTabsRow } from './phase_tabs_row';
export type { PhaseTabsRowProps } from './phase_tabs_row';

export type { PreservedTimeUnit, TimeUnit } from './time_unit_types';
export { PRESERVED_TIME_UNITS } from './time_unit_types';
export { TIME_UNIT_OPTIONS } from './time_unit_options';

export {
  formatDuration,
  getDoubledDurationFromPrevious,
  getMultipleStepAttributes,
  parseInterval,
  parseIntervalWithDefaultUnit,
  toMilliseconds,
} from './duration_utils';
export {
  exceedsMaximumRetentionPeriod,
  getMaximumRetentionMessage,
  getMaximumRetentionPeriodMs,
} from './maximum_retention';

export { getUnitSelectOptions, isPreservedNonDefaultUnit } from './unit_select_options';
export type { TimeUnitSelectOption } from './unit_select_options';
export { downsamplingHelpText } from './i18n';
export { zodResolver } from './zod_resolver';

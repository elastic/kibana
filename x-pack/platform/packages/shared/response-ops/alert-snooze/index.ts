/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { QuickSnoozePanel } from './components/quick_snooze_panel';
export type {
  QuickSnoozePanelProps,
  SnoozeUnit,
  QuickDurationId,
  CustomSnoozeMode,
  CustomDurationState,
} from './components/quick_snooze_panel';

export { SnoozeDurationPicker } from './components/snooze_duration_picker';
export type { SnoozeDurationPickerProps } from './components/snooze_duration_picker';

export { QuickSnoozePopover } from './components/quick_snooze_popover';
export type { QuickSnoozePopoverProps } from './components/quick_snooze_popover';

export {
  PANEL_TITLE,
  QUICK_SNOOZE_POPOVER_SUBTITLE,
  QUICK_SNOOZE_POPOVER_APPLY,
} from './components/translations';

export { buildSnoozeSummary } from './utils/build_snooze_summary';
export type { BuildSnoozeSummaryParams } from './utils/build_snooze_summary';

export { AlertSnoozeBadge } from './components/alert_snooze_badge';
export type { AlertSnoozeBadgeProps } from './components/alert_snooze_badge';

export { ConditionalSnoozePanel } from './components/conditional_snooze_panel';
export type {
  ConditionalSnoozePanelProps,
  ConditionalSnoozeSchedule,
  SnoozeCondition,
} from './components/conditional_snooze_panel';

export { AlertSnoozePopover } from './components/alert_snooze_popover';
export type {
  AlertSnoozePopoverProps,
  AlertSnoozePayload,
} from './components/alert_snooze_popover';

export { AlertSnoozePanelInline } from './components/alert_snooze_panel_inline';
export type { AlertSnoozePanelInlineProps } from './components/alert_snooze_panel_inline';

export { useAlertSnooze } from './hooks/use_alert_snooze';
export type { UseAlertSnoozeParams, UseAlertSnoozeResult } from './hooks/use_alert_snooze';

export {
  DEFAULT_DATA_CONDITION_TYPES,
  fieldChangeDescriptor,
  severityChangeDescriptor,
  severityEqualsDescriptor,
} from './components/built_in_data_conditions';
export { DataConditionType } from './components/types';
export type {
  AlertSeverityLevel,
  DataConditionDescriptorContext,
  DataConditionEntry,
  DataConditionTypeDescriptor,
} from './components/types';

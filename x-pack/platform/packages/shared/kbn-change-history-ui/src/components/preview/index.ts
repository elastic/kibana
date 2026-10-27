/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { ChangeHistoryPreview } from './change_history_preview';
export {
  CHANGE_HISTORY_PREVIEW_FOOTER_HEIGHT,
  ChangeHistoryPreviewFooter,
  ChangeHistoryPreviewFooterSpacer,
} from './change_history_preview_footer';
export { ChangeHistoryPreviewSettingsSection } from './change_history_preview_settings_popover';
export type {
  ChangeHistoryPreviewProps,
  ChangeHistoryMonacoLanguage,
  ChangeHistoryPreviewEditorContext,
} from './change_history_preview';
export type {
  ChangeHistoryCompareBadgeColor,
  ChangeHistoryCompareIndicator,
} from './change_history_compare_indicator';
export {
  getChangeHistoryValidationDisplayOptions,
  CHANGE_HISTORY_DIFF_GLOBAL_EDITOR_OPTIONS,
  CHANGE_HISTORY_SPLIT_DIFF_EDITOR_OPTIONS,
  CHANGE_HISTORY_UNIFIED_DIFF_EDITOR_OPTIONS,
  CHANGE_HISTORY_UNIFIED_DIFF_MODIFIED_EDITOR_OPTIONS,
} from './monaco_options';
export { createChangeHistoryEuiMonacoTheme, euiChangeHistoryMonacoTheme } from './monaco_theme';
export type {
  ChangeHistoryMonacoTheme,
  ChangeHistoryMonacoThemeDefinition,
  CreateChangeHistoryEuiMonacoThemeOptions,
} from './monaco_theme';

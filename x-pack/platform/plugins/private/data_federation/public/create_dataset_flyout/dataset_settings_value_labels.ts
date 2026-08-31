/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createDatasetFlyoutStrings } from './create_dataset_flyout_i18n';
import {
  DATETIME_FORMAT_PRESETS,
  DELIMITER_PRESETS,
  ENCODING_PRESETS,
  ERROR_MODE_SUPER_SELECT_OPTIONS,
  HEADER_ROW_SUPER_SELECT_OPTIONS,
  MODE_SUPER_SELECT_OPTIONS,
  MULTI_VALUE_SYNTAX_SUPER_SELECT_OPTIONS,
  NULL_VALUE_PRESETS,
  OPTIMIZED_READER_SUPER_SELECT_OPTIONS,
  PARTITION_DETECTION_SUPER_SELECT_OPTIONS,
  PARTITION_PATH_PRESETS,
  SCHEMA_RESOLUTION_SUPER_SELECT_OPTIONS,
} from './dataset_settings_options';
import type { DatasetSettingsFieldId } from './dataset_settings_visibility';

export const getDatasetSettingsFieldLabel = (fieldId: DatasetSettingsFieldId): string => {
  switch (fieldId) {
    case 'partition_detection':
      return createDatasetFlyoutStrings.settingsPartitionDetectionLabel();
    case 'partition_path':
      return createDatasetFlyoutStrings.settingsPartitionPathLabel();
    case 'schema_sample_size':
      return createDatasetFlyoutStrings.settingsSchemaSampleSizeLabel();
    case 'schema_resolution':
      return createDatasetFlyoutStrings.settingsSchemaResolutionLabel();
    case 'delimiter':
      return createDatasetFlyoutStrings.settingsDelimiterLabel();
    case 'mode':
      return createDatasetFlyoutStrings.settingsModeLabel();
    case 'quote':
      return createDatasetFlyoutStrings.settingsQuoteLabel();
    case 'escape':
      return createDatasetFlyoutStrings.settingsEscapeLabel();
    case 'comment':
      return createDatasetFlyoutStrings.settingsCommentLabel();
    case 'encoding':
      return createDatasetFlyoutStrings.settingsEncodingLabel();
    case 'header_row':
      return createDatasetFlyoutStrings.settingsHeaderRowLabel();
    case 'column_prefix':
      return createDatasetFlyoutStrings.settingsColumnPrefixLabel();
    case 'null_value':
      return createDatasetFlyoutStrings.settingsNullValueLabel();
    case 'datetime_format':
      return createDatasetFlyoutStrings.settingsDatetimeFormatLabel();
    case 'multi_value_syntax':
      return createDatasetFlyoutStrings.settingsMultiValueSyntaxLabel();
    case 'error_mode':
      return createDatasetFlyoutStrings.settingsErrorModeLabel();
    case 'max_errors':
      return createDatasetFlyoutStrings.settingsMaxErrorsLabel();
    case 'max_error_ratio':
      return createDatasetFlyoutStrings.settingsMaxErrorRatioLabel();
    case 'max_field_size':
      return createDatasetFlyoutStrings.settingsMaxFieldSizeLabel();
    case 'segment_size':
      return createDatasetFlyoutStrings.settingsSegmentSizeLabel();
    case 'optimized_reader':
      return createDatasetFlyoutStrings.settingsOptimizedReaderLabel();
    case 'late_materialization':
      return createDatasetFlyoutStrings.settingsLateMaterializationLabel();
  }
};

const lookupOptionLabel = <T extends string>(
  value: string,
  options: Array<{ value: T; label: string }>
): string | undefined => options.find((option) => option.value === value)?.label;

const lookupPresetLabel = (
  value: string,
  presets: Array<{ value: string; label: string }>
): string => presets.find((preset) => preset.value === value)?.label ?? value;

export const formatSettingsFieldDisplayValue = (
  fieldId: DatasetSettingsFieldId,
  value: string
): string => {
  switch (fieldId) {
    case 'partition_detection':
      return lookupOptionLabel(value, PARTITION_DETECTION_SUPER_SELECT_OPTIONS()) ?? value;
    case 'schema_resolution':
      return lookupOptionLabel(value, SCHEMA_RESOLUTION_SUPER_SELECT_OPTIONS()) ?? value;
    case 'header_row':
    case 'optimized_reader':
    case 'late_materialization':
      return (
        lookupOptionLabel(
          value,
          fieldId === 'header_row'
            ? HEADER_ROW_SUPER_SELECT_OPTIONS()
            : OPTIMIZED_READER_SUPER_SELECT_OPTIONS()
        ) ?? value
      );
    case 'mode':
      return lookupOptionLabel(value, MODE_SUPER_SELECT_OPTIONS()) ?? value;
    case 'error_mode':
      return lookupOptionLabel(value, ERROR_MODE_SUPER_SELECT_OPTIONS()) ?? value;
    case 'multi_value_syntax':
      return lookupOptionLabel(value, MULTI_VALUE_SYNTAX_SUPER_SELECT_OPTIONS()) ?? value;
    case 'delimiter':
      return lookupPresetLabel(value, DELIMITER_PRESETS());
    case 'encoding':
      return lookupPresetLabel(value, ENCODING_PRESETS());
    case 'null_value':
      return lookupPresetLabel(value, NULL_VALUE_PRESETS());
    case 'datetime_format':
      return lookupPresetLabel(value, DATETIME_FORMAT_PRESETS());
    case 'partition_path':
      return lookupPresetLabel(value, PARTITION_PATH_PRESETS());
    default:
      return value;
  }
};

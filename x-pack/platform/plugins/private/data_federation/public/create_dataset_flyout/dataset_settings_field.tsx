/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { EuiFieldNumber, EuiFieldText, EuiFormRow } from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useController } from 'react-hook-form';

import { createDatasetFlyoutStrings } from './create_dataset_flyout_i18n';
import type { CreateDatasetFormValues } from './create_dataset_flyout_form_state';
import {
  DELIMITER_PRESETS,
  DATETIME_FORMAT_PRESETS,
  ENCODING_PRESETS,
  ERROR_MODE_SUPER_SELECT_OPTIONS,
  HEADER_ROW_SUPER_SELECT_OPTIONS,
  HIVE_PARTITIONING_SUPER_SELECT_OPTIONS,
  MODE_SUPER_SELECT_OPTIONS,
  MULTI_VALUE_SYNTAX_SUPER_SELECT_OPTIONS,
  NULL_VALUE_PRESETS,
  OPTIMIZED_READER_SUPER_SELECT_OPTIONS,
  PARTITION_DETECTION_SUPER_SELECT_OPTIONS,
  PARTITION_PATH_PRESETS,
  SCHEMA_RESOLUTION_SUPER_SELECT_OPTIONS,
} from './dataset_settings_options';
import type { DatasetSettingsFieldId } from './dataset_settings_visibility';
import { SettingsEnumSuperSelect } from './settings_enum_super_select';
import { SettingsPresetComboBox } from './settings_preset_combo_box';
import {
  validateMaxErrorRatio,
  validateMaxErrors,
  validateSchemaSampleSize,
} from './create_dataset_flyout_form_state';
import { MaxFieldSizeField } from './max_field_size_field';

export interface DatasetSettingsFieldProps {
  control: Control<CreateDatasetFormValues>;
  fieldId: DatasetSettingsFieldId;
  testSubjPrefix: string;
}

export const DatasetSettingsField: FunctionComponent<DatasetSettingsFieldProps> = ({
  control,
  fieldId,
  testSubjPrefix,
}) => {
  switch (fieldId) {
    case 'partition_detection':
      return (
        <SettingsEnumSuperSelect
          control={control}
          name="settings.partition_detection"
          label={createDatasetFlyoutStrings.settingsPartitionDetectionLabel()}
          placeholder={createDatasetFlyoutStrings.settingsPartitionDetectionPlaceholder()}
          options={PARTITION_DETECTION_SUPER_SELECT_OPTIONS()}
          data-test-subj={`${testSubjPrefix}SettingsPartitionDetection`}
        />
      );
    case 'partition_path':
      return (
        <SettingsPresetComboBox
          control={control}
          name="settings.partition_path"
          label={createDatasetFlyoutStrings.settingsPartitionPathLabel()}
          helpText={createDatasetFlyoutStrings.settingsPartitionPathHelp()}
          placeholder={createDatasetFlyoutStrings.settingsPartitionPathPlaceholder()}
          presets={PARTITION_PATH_PRESETS()}
          data-test-subj={`${testSubjPrefix}SettingsPartitionPath`}
        />
      );
    case 'schema_sample_size':
      return <SchemaSampleSizeField control={control} testSubjPrefix={testSubjPrefix} />;
    case 'schema_resolution':
      return (
        <SettingsEnumSuperSelect
          control={control}
          name="settings.schema_resolution"
          label={createDatasetFlyoutStrings.settingsSchemaResolutionLabel()}
          helpText={createDatasetFlyoutStrings.settingsSchemaResolutionHelp()}
          placeholder={createDatasetFlyoutStrings.settingsSchemaResolutionPlaceholder()}
          options={SCHEMA_RESOLUTION_SUPER_SELECT_OPTIONS()}
          data-test-subj={`${testSubjPrefix}SettingsSchemaResolution`}
        />
      );
    case 'hive_partitioning':
      return (
        <SettingsEnumSuperSelect
          control={control}
          name="settings.hive_partitioning"
          label={createDatasetFlyoutStrings.settingsHivePartitioningLabel()}
          placeholder={createDatasetFlyoutStrings.settingsHivePartitioningPlaceholder()}
          options={HIVE_PARTITIONING_SUPER_SELECT_OPTIONS()}
          data-test-subj={`${testSubjPrefix}SettingsHivePartitioning`}
        />
      );
    case 'delimiter':
      return (
        <SettingsPresetComboBox
          control={control}
          name="settings.delimiter"
          label={createDatasetFlyoutStrings.settingsDelimiterLabel()}
          helpText={createDatasetFlyoutStrings.settingsDelimiterHelp()}
          placeholder={createDatasetFlyoutStrings.settingsDelimiterPlaceholder()}
          presets={DELIMITER_PRESETS()}
          data-test-subj={`${testSubjPrefix}SettingsDelimiter`}
        />
      );
    case 'mode':
      return (
        <SettingsEnumSuperSelect
          control={control}
          name="settings.mode"
          label={createDatasetFlyoutStrings.settingsModeLabel()}
          placeholder={createDatasetFlyoutStrings.settingsModePlaceholder()}
          options={MODE_SUPER_SELECT_OPTIONS()}
          data-test-subj={`${testSubjPrefix}SettingsMode`}
        />
      );
    case 'quote':
      return (
        <TextSettingsField
          control={control}
          name="settings.quote"
          label={createDatasetFlyoutStrings.settingsQuoteLabel()}
          helpText={createDatasetFlyoutStrings.settingsQuoteHelp()}
          testSubj={`${testSubjPrefix}SettingsQuote`}
        />
      );
    case 'escape':
      return (
        <TextSettingsField
          control={control}
          name="settings.escape"
          label={createDatasetFlyoutStrings.settingsEscapeLabel()}
          helpText={createDatasetFlyoutStrings.settingsEscapeHelp()}
          testSubj={`${testSubjPrefix}SettingsEscape`}
        />
      );
    case 'comment':
      return (
        <TextSettingsField
          control={control}
          name="settings.comment"
          label={createDatasetFlyoutStrings.settingsCommentLabel()}
          helpText={createDatasetFlyoutStrings.settingsCommentHelp()}
          testSubj={`${testSubjPrefix}SettingsComment`}
        />
      );
    case 'encoding':
      return (
        <SettingsPresetComboBox
          control={control}
          name="settings.encoding"
          label={createDatasetFlyoutStrings.settingsEncodingLabel()}
          helpText={createDatasetFlyoutStrings.settingsEncodingHelp()}
          placeholder={createDatasetFlyoutStrings.settingsEncodingPlaceholder()}
          presets={ENCODING_PRESETS()}
          data-test-subj={`${testSubjPrefix}SettingsEncoding`}
        />
      );
    case 'header_row':
      return (
        <SettingsEnumSuperSelect
          control={control}
          name="settings.header_row"
          label={createDatasetFlyoutStrings.settingsHeaderRowLabel()}
          placeholder={createDatasetFlyoutStrings.settingsHeaderRowPlaceholder()}
          options={HEADER_ROW_SUPER_SELECT_OPTIONS()}
          data-test-subj={`${testSubjPrefix}SettingsHeaderRow`}
        />
      );
    case 'column_prefix':
      return (
        <TextSettingsField
          control={control}
          name="settings.column_prefix"
          label={createDatasetFlyoutStrings.settingsColumnPrefixLabel()}
          helpText={createDatasetFlyoutStrings.settingsColumnPrefixHelp()}
          testSubj={`${testSubjPrefix}SettingsColumnPrefix`}
        />
      );
    case 'null_value':
      return (
        <SettingsPresetComboBox
          control={control}
          name="settings.null_value"
          label={createDatasetFlyoutStrings.settingsNullValueLabel()}
          helpText={createDatasetFlyoutStrings.settingsNullValueHelp()}
          placeholder={createDatasetFlyoutStrings.settingsNullValuePlaceholder()}
          presets={NULL_VALUE_PRESETS()}
          data-test-subj={`${testSubjPrefix}SettingsNullValue`}
        />
      );
    case 'datetime_format':
      return (
        <SettingsPresetComboBox
          control={control}
          name="settings.datetime_format"
          label={createDatasetFlyoutStrings.settingsDatetimeFormatLabel()}
          helpText={createDatasetFlyoutStrings.settingsDatetimeFormatHelp()}
          placeholder={createDatasetFlyoutStrings.settingsDatetimeFormatPlaceholder()}
          presets={DATETIME_FORMAT_PRESETS()}
          data-test-subj={`${testSubjPrefix}SettingsDatetimeFormat`}
        />
      );
    case 'multi_value_syntax':
      return (
        <SettingsEnumSuperSelect
          control={control}
          name="settings.multi_value_syntax"
          label={createDatasetFlyoutStrings.settingsMultiValueSyntaxLabel()}
          placeholder={createDatasetFlyoutStrings.settingsMultiValueSyntaxPlaceholder()}
          options={MULTI_VALUE_SYNTAX_SUPER_SELECT_OPTIONS()}
          data-test-subj={`${testSubjPrefix}SettingsMultiValueSyntax`}
        />
      );
    case 'error_mode':
      return (
        <SettingsEnumSuperSelect
          control={control}
          name="settings.error_mode"
          label={createDatasetFlyoutStrings.settingsErrorModeLabel()}
          placeholder={createDatasetFlyoutStrings.settingsErrorModePlaceholder()}
          options={ERROR_MODE_SUPER_SELECT_OPTIONS()}
          data-test-subj={`${testSubjPrefix}SettingsErrorMode`}
        />
      );
    case 'max_errors':
      return (
        <NumberSettingsField
          control={control}
          name="settings.max_errors"
          label={createDatasetFlyoutStrings.settingsMaxErrorsLabel()}
          helpText={createDatasetFlyoutStrings.settingsMaxErrorsHelp()}
          testSubj={`${testSubjPrefix}SettingsMaxErrors`}
          min={0}
          rules={{ validate: validateMaxErrors }}
        />
      );
    case 'max_error_ratio':
      return (
        <NumberSettingsField
          control={control}
          name="settings.max_error_ratio"
          label={createDatasetFlyoutStrings.settingsMaxErrorRatioLabel()}
          helpText={createDatasetFlyoutStrings.settingsMaxErrorRatioHelp()}
          testSubj={`${testSubjPrefix}SettingsMaxErrorRatio`}
          min={0}
          max={1}
          step={0.01}
          rules={{ validate: validateMaxErrorRatio }}
        />
      );
    case 'max_field_size':
      return <MaxFieldSizeField control={control} testSubjPrefix={testSubjPrefix} />;
    case 'segment_size':
      return (
        <TextSettingsField
          control={control}
          name="settings.segment_size"
          label={createDatasetFlyoutStrings.settingsSegmentSizeLabel()}
          helpText={createDatasetFlyoutStrings.settingsSegmentSizeHelp()}
          testSubj={`${testSubjPrefix}SettingsSegmentSize`}
        />
      );
    case 'optimized_reader':
      return (
        <SettingsEnumSuperSelect
          control={control}
          name="settings.optimized_reader"
          label={createDatasetFlyoutStrings.settingsOptimizedReaderLabel()}
          helpText={createDatasetFlyoutStrings.settingsOptimizedReaderHelp()}
          placeholder={createDatasetFlyoutStrings.settingsOptimizedReaderPlaceholder()}
          options={OPTIMIZED_READER_SUPER_SELECT_OPTIONS()}
          data-test-subj={`${testSubjPrefix}SettingsOptimizedReader`}
        />
      );
    case 'late_materialization':
      return (
        <SettingsEnumSuperSelect
          control={control}
          name="settings.late_materialization"
          label={createDatasetFlyoutStrings.settingsLateMaterializationLabel()}
          helpText={createDatasetFlyoutStrings.settingsLateMaterializationHelp()}
          placeholder={createDatasetFlyoutStrings.settingsLateMaterializationPlaceholder()}
          options={OPTIMIZED_READER_SUPER_SELECT_OPTIONS()}
          data-test-subj={`${testSubjPrefix}SettingsLateMaterialization`}
        />
      );
    default:
      return null;
  }
};

const SchemaSampleSizeField: FunctionComponent<{
  control: Control<CreateDatasetFormValues>;
  testSubjPrefix: string;
}> = ({ control, testSubjPrefix }) => {
  const { field, fieldState } = useController({
    name: 'settings.schema_sample_size',
    control,
    rules: { validate: validateSchemaSampleSize },
  });

  return (
    <EuiFormRow
      label={createDatasetFlyoutStrings.settingsSchemaSampleSizeLabel()}
      helpText={createDatasetFlyoutStrings.settingsSchemaSampleSizeHelp()}
      fullWidth
      isInvalid={Boolean(fieldState.error)}
      error={fieldState.error?.message}
    >
      <EuiFieldNumber
        data-test-subj={`${testSubjPrefix}SettingsSchemaSampleSize`}
        fullWidth
        compressed
        min={1}
        step={1}
        isInvalid={Boolean(fieldState.error)}
        value={field.value}
        onChange={(event) => field.onChange(event.target.value)}
        name={field.name}
        inputRef={field.ref}
      />
    </EuiFormRow>
  );
};

const TextSettingsField: FunctionComponent<{
  control: Control<CreateDatasetFormValues>;
  name: `settings.${string}`;
  label: string;
  helpText?: string;
  testSubj: string;
}> = ({ control, name, label, helpText, testSubj }) => {
  const { field } = useController({ name, control });

  return (
    <EuiFormRow label={label} helpText={helpText} fullWidth>
      <EuiFieldText
        data-test-subj={testSubj}
        fullWidth
        compressed
        value={field.value}
        onChange={(event) => field.onChange(event.target.value)}
        name={field.name}
        inputRef={field.ref}
      />
    </EuiFormRow>
  );
};

const NumberSettingsField: FunctionComponent<{
  control: Control<CreateDatasetFormValues>;
  name: `settings.${string}`;
  label: string;
  helpText?: string;
  testSubj: string;
  min?: number;
  max?: number;
  step?: number;
  rules?: { validate: (value: string) => true | string };
}> = ({ control, name, label, helpText, testSubj, min, max, step, rules }) => {
  const { field, fieldState } = useController({ name, control, rules });

  return (
    <EuiFormRow
      label={label}
      helpText={helpText}
      fullWidth
      isInvalid={Boolean(fieldState.error)}
      error={fieldState.error?.message}
    >
      <EuiFieldNumber
        data-test-subj={testSubj}
        fullWidth
        compressed
        min={min}
        max={max}
        step={step}
        isInvalid={Boolean(fieldState.error)}
        value={field.value}
        onChange={(event) => field.onChange(event.target.value)}
        name={field.name}
        inputRef={field.ref}
      />
    </EuiFormRow>
  );
};

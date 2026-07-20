/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFieldNumber,
  EuiFieldText,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useController } from 'react-hook-form';

import { createDatasetFlyoutStrings } from './create_dataset_flyout_i18n';
import {
  validateMaxErrorRatio,
  validateMaxErrors,
  validateMaxFieldSize,
  validateSchemaSampleSize,
  type CreateDatasetFormValues,
  type DatasetBooleanFormValue,
  type DatasetFormatFormValue,
  type DatasetSchemaResolutionFormValue,
} from './create_dataset_flyout_form_state';

// ---------------------------------------------------------------------------
// Module-level option factories — shared across components so each select
// renders consistently wherever it appears.
// ---------------------------------------------------------------------------

const FORMAT_OPTIONS = () => [
  { value: '', text: createDatasetFlyoutStrings.settingsFormatPlaceholder() },
  { value: 'csv', text: createDatasetFlyoutStrings.settingsFormatCsv() },
  { value: 'tsv', text: createDatasetFlyoutStrings.settingsFormatTsv() },
  { value: 'ndjson', text: createDatasetFlyoutStrings.settingsFormatNdjson() },
  { value: 'parquet', text: createDatasetFlyoutStrings.settingsFormatParquet() },
  // { value: 'orc', text: createDatasetFlyoutStrings.settingsFormatOrc() },
];

const SCHEMA_RESOLUTION_OPTIONS = () => [
  { value: '', text: createDatasetFlyoutStrings.settingsSchemaResolutionPlaceholder() },
  {
    value: 'first_file_wins',
    text: createDatasetFlyoutStrings.settingsSchemaResolutionFirstFileWins(),
  },
  { value: 'strict', text: createDatasetFlyoutStrings.settingsSchemaResolutionStrict() },
  {
    value: 'union_by_name',
    text: createDatasetFlyoutStrings.settingsSchemaResolutionUnionByName(),
  },
];

const PARTITION_DETECTION_OPTIONS = () => [
  { value: '', text: createDatasetFlyoutStrings.settingsPartitionDetectionPlaceholder() },
  { value: 'auto', text: createDatasetFlyoutStrings.settingsPartitionDetectionAuto() },
  { value: 'hive', text: createDatasetFlyoutStrings.settingsPartitionDetectionHive() },
  { value: 'none', text: createDatasetFlyoutStrings.settingsPartitionDetectionNone() },
];

const ERROR_MODE_OPTIONS = () => [
  { value: '', text: createDatasetFlyoutStrings.settingsErrorModePlaceholder() },
  { value: 'fail_fast', text: createDatasetFlyoutStrings.settingsErrorModeFailFast() },
  { value: 'skip_row', text: createDatasetFlyoutStrings.settingsErrorModeSkipRow() },
  { value: 'null_field', text: createDatasetFlyoutStrings.settingsErrorModeNullField() },
];

const MODE_OPTIONS = () => [
  { value: '', text: createDatasetFlyoutStrings.settingsModePlaceholder() },
  { value: 'quoted', text: createDatasetFlyoutStrings.settingsModeQuoted() },
  { value: 'escaped', text: createDatasetFlyoutStrings.settingsModeEscaped() },
  { value: 'plain', text: createDatasetFlyoutStrings.settingsModePlain() },
];

const HEADER_ROW_OPTIONS = () => [
  { value: '', text: createDatasetFlyoutStrings.settingsHeaderRowPlaceholder() },
  { value: 'true', text: createDatasetFlyoutStrings.settingsHeaderRowTrue() },
  { value: 'false', text: createDatasetFlyoutStrings.settingsHeaderRowFalse() },
];

const MULTI_VALUE_SYNTAX_OPTIONS = () => [
  { value: '', text: createDatasetFlyoutStrings.settingsMultiValueSyntaxPlaceholder() },
  { value: 'none', text: createDatasetFlyoutStrings.settingsMultiValueSyntaxNone() },
  { value: 'brackets', text: createDatasetFlyoutStrings.settingsMultiValueSyntaxBrackets() },
];

const BOOLEAN_OPTIONS = (placeholder: string, enabled: string, disabled: string) => [
  { value: '', text: placeholder },
  { value: 'true', text: enabled },
  { value: 'false', text: disabled },
];

// ---------------------------------------------------------------------------
// Top-level export
// ---------------------------------------------------------------------------

export function CreateDatasetFlyoutSettings({
  control,
}: {
  control: Control<CreateDatasetFormValues>;
}) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const advancedId = useGeneratedHtmlId({ prefix: 'createDatasetFlyoutAdvancedSettings' });

  const { field: formatField, fieldState: formatFieldState } = useController({
    name: 'settings.format',
    control,
    rules: {
      validate: (value) =>
        value?.trim() ? true : createDatasetFlyoutStrings.settingsFormatRequired(),
    },
  });

  const format = formatField.value as DatasetFormatFormValue;

  return (
    <>
      <EuiSpacer size="m" />
      <EuiFormRow
        label={createDatasetFlyoutStrings.settingsFormatLabel()}
        fullWidth
        isInvalid={Boolean(formatFieldState.error)}
        error={formatFieldState.error?.message}
      >
        <EuiSelect
          options={FORMAT_OPTIONS()}
          data-test-subj="createDatasetFlyoutSettingsFormat"
          fullWidth
          aria-label={createDatasetFlyoutStrings.settingsFormatLabel()}
          value={formatField.value}
          onChange={(e) => formatField.onChange(e.target.value)}
          name={formatField.name}
          inputRef={formatField.ref}
          isInvalid={Boolean(formatFieldState.error)}
        />
      </EuiFormRow>

      {/* Core format settings — shown by default without the expander */}
      <CoreFormatSettings control={control} format={format} />

      <EuiSpacer size="m" />
      <EuiButtonEmpty
        size="s"
        flush="left"
        iconType={isAdvancedOpen ? 'arrowDown' : 'arrowRight'}
        aria-expanded={isAdvancedOpen}
        aria-controls={advancedId}
        onClick={() => setIsAdvancedOpen((v) => !v)}
        data-test-subj="createDatasetFlyoutAdvancedSettingsToggle"
      >
        {isAdvancedOpen
          ? createDatasetFlyoutStrings.advancedSettingsHide()
          : createDatasetFlyoutStrings.advancedSettingsShow()}
      </EuiButtonEmpty>
      <div id={advancedId} hidden={!isAdvancedOpen}>
        <EuiSpacer size="s" />
        {/* Format-independent advanced settings */}
        <UniversalAdvancedSettings control={control} />
        {/* Per-format advanced settings */}
        <FormatAdvancedSettings control={control} format={format} />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Core format settings — shown by default (outside the advanced expander)
// ---------------------------------------------------------------------------

function CoreFormatSettings({
  control,
  format,
}: {
  control: Control<CreateDatasetFormValues>;
  format: DatasetFormatFormValue;
}) {
  if (format !== 'csv' && format !== 'tsv') {
    return null;
  }
  return <CsvTsvCoreSettings control={control} />;
}

// ---------------------------------------------------------------------------
// Universal advanced settings — shown under every format
// ---------------------------------------------------------------------------

function UniversalAdvancedSettings({ control }: { control: Control<CreateDatasetFormValues> }) {
  const { field: schemaResolutionField } = useController({
    name: 'settings.schema_resolution',
    control,
  });
  const { field: partitionDetectionField } = useController({
    name: 'settings.partition_detection',
    control,
  });
  const { field: partitionPathField } = useController({
    name: 'settings.partition_path',
    control,
  });
  const { field: hivePartitioningField } = useController({
    name: 'settings.hive_partitioning',
    control,
  });

  return (
    <>
      <EuiFormRow
        label={createDatasetFlyoutStrings.settingsSchemaResolutionLabel()}
        helpText={createDatasetFlyoutStrings.settingsSchemaResolutionHelp()}
        fullWidth
      >
        <EuiSelect
          options={SCHEMA_RESOLUTION_OPTIONS()}
          data-test-subj="createDatasetFlyoutSettingsSchemaResolution"
          fullWidth
          aria-label={createDatasetFlyoutStrings.settingsSchemaResolutionLabel()}
          value={schemaResolutionField.value}
          onChange={(e) =>
            schemaResolutionField.onChange(e.target.value as DatasetSchemaResolutionFormValue)
          }
          name={schemaResolutionField.name}
          inputRef={schemaResolutionField.ref}
        />
      </EuiFormRow>
      <EuiFormRow label={createDatasetFlyoutStrings.settingsPartitionDetectionLabel()} fullWidth>
        <EuiSelect
          options={PARTITION_DETECTION_OPTIONS()}
          data-test-subj="createDatasetFlyoutSettingsPartitionDetection"
          fullWidth
          aria-label={createDatasetFlyoutStrings.settingsPartitionDetectionLabel()}
          value={partitionDetectionField.value}
          onChange={(e) => partitionDetectionField.onChange(e.target.value)}
          name={partitionDetectionField.name}
          inputRef={partitionDetectionField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={createDatasetFlyoutStrings.settingsPartitionPathLabel()}
        helpText={createDatasetFlyoutStrings.settingsPartitionPathHelp()}
        fullWidth
      >
        <EuiFieldText
          data-test-subj="createDatasetFlyoutSettingsPartitionPath"
          fullWidth
          value={partitionPathField.value}
          onChange={(e) => partitionPathField.onChange(e.target.value)}
          name={partitionPathField.name}
          inputRef={partitionPathField.ref}
        />
      </EuiFormRow>
      <EuiFormRow label={createDatasetFlyoutStrings.settingsHivePartitioningLabel()} fullWidth>
        <EuiSelect
          options={BOOLEAN_OPTIONS(
            createDatasetFlyoutStrings.settingsHivePartitioningPlaceholder(),
            createDatasetFlyoutStrings.settingsHivePartitioningEnabled(),
            createDatasetFlyoutStrings.settingsHivePartitioningDisabled()
          )}
          data-test-subj="createDatasetFlyoutSettingsHivePartitioning"
          fullWidth
          aria-label={createDatasetFlyoutStrings.settingsHivePartitioningLabel()}
          value={hivePartitioningField.value}
          onChange={(e) =>
            hivePartitioningField.onChange(e.target.value as DatasetBooleanFormValue)
          }
          name={hivePartitioningField.name}
          inputRef={hivePartitioningField.ref}
        />
      </EuiFormRow>
    </>
  );
}

// ---------------------------------------------------------------------------
// Per-format advanced settings dispatch
// ---------------------------------------------------------------------------

function FormatAdvancedSettings({
  control,
  format,
}: {
  control: Control<CreateDatasetFormValues>;
  format: DatasetFormatFormValue;
}) {
  if (format === 'csv' || format === 'tsv') {
    return <CsvTsvAdvancedSettings control={control} />;
  }
  if (format === 'ndjson') {
    return <NdjsonSettings control={control} />;
  }
  // parquet, orc, and unselected: no per-format advanced fields
  return null;
}

// ---------------------------------------------------------------------------
// CSV / TSV — core fields (shown by default)
// ---------------------------------------------------------------------------

function CsvTsvCoreSettings({ control }: { control: Control<CreateDatasetFormValues> }) {
  const { field: delimiterField } = useController({ name: 'settings.delimiter', control });
  const { field: modeField } = useController({ name: 'settings.mode', control });
  const { field: headerRowField } = useController({ name: 'settings.header_row', control });

  return (
    <>
      <EuiSpacer size="m" />
      <EuiFormRow
        label={createDatasetFlyoutStrings.settingsDelimiterLabel()}
        helpText={createDatasetFlyoutStrings.settingsDelimiterHelp()}
        fullWidth
      >
        <EuiFieldText
          data-test-subj="createDatasetFlyoutSettingsDelimiter"
          fullWidth
          value={delimiterField.value}
          onChange={(e) => delimiterField.onChange(e.target.value)}
          name={delimiterField.name}
          inputRef={delimiterField.ref}
        />
      </EuiFormRow>
      <EuiFormRow label={createDatasetFlyoutStrings.settingsModeLabel()} fullWidth>
        <EuiSelect
          options={MODE_OPTIONS()}
          data-test-subj="createDatasetFlyoutSettingsMode"
          fullWidth
          aria-label={createDatasetFlyoutStrings.settingsModeLabel()}
          value={modeField.value}
          onChange={(e) => modeField.onChange(e.target.value)}
          name={modeField.name}
          inputRef={modeField.ref}
        />
      </EuiFormRow>
      <EuiFormRow label={createDatasetFlyoutStrings.settingsHeaderRowLabel()} fullWidth>
        <EuiSelect
          options={HEADER_ROW_OPTIONS()}
          data-test-subj="createDatasetFlyoutSettingsHeaderRow"
          fullWidth
          aria-label={createDatasetFlyoutStrings.settingsHeaderRowLabel()}
          value={headerRowField.value}
          onChange={(e) => headerRowField.onChange(e.target.value as DatasetBooleanFormValue)}
          name={headerRowField.name}
          inputRef={headerRowField.ref}
        />
      </EuiFormRow>
    </>
  );
}

// ---------------------------------------------------------------------------
// CSV / TSV — advanced fields (inside the expander)
// ---------------------------------------------------------------------------

function CsvTsvAdvancedSettings({ control }: { control: Control<CreateDatasetFormValues> }) {
  const { field: nullValueField } = useController({ name: 'settings.null_value', control });
  const { field: encodingField } = useController({ name: 'settings.encoding', control });
  const { field: schemaSampleSizeField, fieldState: schemaSampleSizeState } = useController({
    name: 'settings.schema_sample_size',
    control,
    rules: { validate: validateSchemaSampleSize },
  });
  const { field: quoteField } = useController({ name: 'settings.quote', control });
  const { field: escapeField } = useController({ name: 'settings.escape', control });
  const { field: commentField } = useController({ name: 'settings.comment', control });
  const { field: columnPrefixField } = useController({ name: 'settings.column_prefix', control });
  const { field: datetimeFormatField } = useController({
    name: 'settings.datetime_format',
    control,
  });
  const { field: multiValueSyntaxField } = useController({
    name: 'settings.multi_value_syntax',
    control,
  });
  const { field: maxFieldSizeField, fieldState: maxFieldSizeState } = useController({
    name: 'settings.max_field_size',
    control,
    rules: { validate: validateMaxFieldSize },
  });
  const { field: errorModeField } = useController({ name: 'settings.error_mode', control });
  const { field: maxErrorsField, fieldState: maxErrorsState } = useController({
    name: 'settings.max_errors',
    control,
    rules: { validate: validateMaxErrors },
  });
  const { field: maxErrorRatioField, fieldState: maxErrorRatioState } = useController({
    name: 'settings.max_error_ratio',
    control,
    rules: { validate: validateMaxErrorRatio },
  });

  return (
    <>
      <EuiFormRow
        label={createDatasetFlyoutStrings.settingsNullValueLabel()}
        helpText={createDatasetFlyoutStrings.settingsNullValueHelp()}
        fullWidth
      >
        <EuiFieldText
          data-test-subj="createDatasetFlyoutSettingsNullValue"
          fullWidth
          value={nullValueField.value}
          onChange={(e) => nullValueField.onChange(e.target.value)}
          name={nullValueField.name}
          inputRef={nullValueField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={createDatasetFlyoutStrings.settingsEncodingLabel()}
        helpText={createDatasetFlyoutStrings.settingsEncodingHelp()}
        fullWidth
      >
        <EuiFieldText
          data-test-subj="createDatasetFlyoutSettingsEncoding"
          fullWidth
          value={encodingField.value}
          onChange={(e) => encodingField.onChange(e.target.value)}
          name={encodingField.name}
          inputRef={encodingField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={createDatasetFlyoutStrings.settingsSchemaSampleSizeLabel()}
        helpText={createDatasetFlyoutStrings.settingsSchemaSampleSizeHelp()}
        fullWidth
        isInvalid={Boolean(schemaSampleSizeState.error)}
        error={schemaSampleSizeState.error?.message}
      >
        <EuiFieldNumber
          data-test-subj="createDatasetFlyoutSettingsSchemaSampleSize"
          fullWidth
          min={1}
          step={1}
          isInvalid={Boolean(schemaSampleSizeState.error)}
          value={schemaSampleSizeField.value}
          onChange={(e) => schemaSampleSizeField.onChange(e.target.value)}
          name={schemaSampleSizeField.name}
          inputRef={schemaSampleSizeField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={createDatasetFlyoutStrings.settingsQuoteLabel()}
        helpText={createDatasetFlyoutStrings.settingsQuoteHelp()}
        fullWidth
      >
        <EuiFieldText
          data-test-subj="createDatasetFlyoutSettingsQuote"
          fullWidth
          value={quoteField.value}
          onChange={(e) => quoteField.onChange(e.target.value)}
          name={quoteField.name}
          inputRef={quoteField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={createDatasetFlyoutStrings.settingsEscapeLabel()}
        helpText={createDatasetFlyoutStrings.settingsEscapeHelp()}
        fullWidth
      >
        <EuiFieldText
          data-test-subj="createDatasetFlyoutSettingsEscape"
          fullWidth
          value={escapeField.value}
          onChange={(e) => escapeField.onChange(e.target.value)}
          name={escapeField.name}
          inputRef={escapeField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={createDatasetFlyoutStrings.settingsCommentLabel()}
        helpText={createDatasetFlyoutStrings.settingsCommentHelp()}
        fullWidth
      >
        <EuiFieldText
          data-test-subj="createDatasetFlyoutSettingsComment"
          fullWidth
          value={commentField.value}
          onChange={(e) => commentField.onChange(e.target.value)}
          name={commentField.name}
          inputRef={commentField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={createDatasetFlyoutStrings.settingsColumnPrefixLabel()}
        helpText={createDatasetFlyoutStrings.settingsColumnPrefixHelp()}
        fullWidth
      >
        <EuiFieldText
          data-test-subj="createDatasetFlyoutSettingsColumnPrefix"
          fullWidth
          value={columnPrefixField.value}
          onChange={(e) => columnPrefixField.onChange(e.target.value)}
          name={columnPrefixField.name}
          inputRef={columnPrefixField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={createDatasetFlyoutStrings.settingsDatetimeFormatLabel()}
        helpText={createDatasetFlyoutStrings.settingsDatetimeFormatHelp()}
        fullWidth
      >
        <EuiFieldText
          data-test-subj="createDatasetFlyoutSettingsDatetimeFormat"
          fullWidth
          value={datetimeFormatField.value}
          onChange={(e) => datetimeFormatField.onChange(e.target.value)}
          name={datetimeFormatField.name}
          inputRef={datetimeFormatField.ref}
        />
      </EuiFormRow>
      <EuiFormRow label={createDatasetFlyoutStrings.settingsMultiValueSyntaxLabel()} fullWidth>
        <EuiSelect
          options={MULTI_VALUE_SYNTAX_OPTIONS()}
          data-test-subj="createDatasetFlyoutSettingsMultiValueSyntax"
          fullWidth
          aria-label={createDatasetFlyoutStrings.settingsMultiValueSyntaxLabel()}
          value={multiValueSyntaxField.value}
          onChange={(e) => multiValueSyntaxField.onChange(e.target.value)}
          name={multiValueSyntaxField.name}
          inputRef={multiValueSyntaxField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={createDatasetFlyoutStrings.settingsMaxFieldSizeLabel()}
        helpText={createDatasetFlyoutStrings.settingsMaxFieldSizeHelp()}
        fullWidth
        isInvalid={Boolean(maxFieldSizeState.error)}
        error={maxFieldSizeState.error?.message}
      >
        <EuiFieldNumber
          data-test-subj="createDatasetFlyoutSettingsMaxFieldSize"
          fullWidth
          min={0}
          step={1}
          isInvalid={Boolean(maxFieldSizeState.error)}
          value={maxFieldSizeField.value}
          onChange={(e) => maxFieldSizeField.onChange(e.target.value)}
          name={maxFieldSizeField.name}
          inputRef={maxFieldSizeField.ref}
        />
      </EuiFormRow>
      <EuiFormRow label={createDatasetFlyoutStrings.settingsErrorModeLabel()} fullWidth>
        <EuiSelect
          options={ERROR_MODE_OPTIONS()}
          data-test-subj="createDatasetFlyoutSettingsErrorMode"
          fullWidth
          aria-label={createDatasetFlyoutStrings.settingsErrorModeLabel()}
          value={errorModeField.value}
          onChange={(e) => errorModeField.onChange(e.target.value)}
          name={errorModeField.name}
          inputRef={errorModeField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={createDatasetFlyoutStrings.settingsMaxErrorsLabel()}
        helpText={createDatasetFlyoutStrings.settingsMaxErrorsHelp()}
        fullWidth
        isInvalid={Boolean(maxErrorsState.error)}
        error={maxErrorsState.error?.message}
      >
        <EuiFieldNumber
          data-test-subj="createDatasetFlyoutSettingsMaxErrors"
          fullWidth
          min={0}
          step={1}
          isInvalid={Boolean(maxErrorsState.error)}
          value={maxErrorsField.value}
          onChange={(e) => maxErrorsField.onChange(e.target.value)}
          name={maxErrorsField.name}
          inputRef={maxErrorsField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={createDatasetFlyoutStrings.settingsMaxErrorRatioLabel()}
        helpText={createDatasetFlyoutStrings.settingsMaxErrorRatioHelp()}
        fullWidth
        isInvalid={Boolean(maxErrorRatioState.error)}
        error={maxErrorRatioState.error?.message}
      >
        <EuiFieldNumber
          data-test-subj="createDatasetFlyoutSettingsMaxErrorRatio"
          fullWidth
          min={0}
          max={1}
          step={0.01}
          isInvalid={Boolean(maxErrorRatioState.error)}
          value={maxErrorRatioField.value}
          onChange={(e) => maxErrorRatioField.onChange(e.target.value)}
          name={maxErrorRatioField.name}
          inputRef={maxErrorRatioField.ref}
        />
      </EuiFormRow>
    </>
  );
}

// ---------------------------------------------------------------------------
// NDJSON — advanced fields (inside the expander)
// ---------------------------------------------------------------------------

function NdjsonSettings({ control }: { control: Control<CreateDatasetFormValues> }) {
  const { field: schemaSampleSizeField, fieldState: schemaSampleSizeState } = useController({
    name: 'settings.schema_sample_size',
    control,
    rules: { validate: validateSchemaSampleSize },
  });
  const { field: datetimeFormatField } = useController({
    name: 'settings.datetime_format',
    control,
  });

  return (
    <>
      <EuiFormRow
        label={createDatasetFlyoutStrings.settingsSchemaSampleSizeLabel()}
        helpText={createDatasetFlyoutStrings.settingsSchemaSampleSizeHelp()}
        fullWidth
        isInvalid={Boolean(schemaSampleSizeState.error)}
        error={schemaSampleSizeState.error?.message}
      >
        <EuiFieldNumber
          data-test-subj="createDatasetFlyoutSettingsSchemaSampleSize"
          fullWidth
          min={1}
          step={1}
          isInvalid={Boolean(schemaSampleSizeState.error)}
          value={schemaSampleSizeField.value}
          onChange={(e) => schemaSampleSizeField.onChange(e.target.value)}
          name={schemaSampleSizeField.name}
          inputRef={schemaSampleSizeField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={createDatasetFlyoutStrings.settingsDatetimeFormatLabel()}
        helpText={createDatasetFlyoutStrings.settingsDatetimeFormatHelp()}
        fullWidth
      >
        <EuiFieldText
          data-test-subj="createDatasetFlyoutSettingsDatetimeFormat"
          fullWidth
          value={datetimeFormatField.value}
          onChange={(e) => datetimeFormatField.onChange(e.target.value)}
          name={datetimeFormatField.name}
          inputRef={datetimeFormatField.ref}
        />
      </EuiFormRow>
    </>
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFieldNumber,
  EuiFieldText,
  EuiFormRow,
  EuiLink,
  EuiSelect,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useController, useWatch } from 'react-hook-form';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import type { DataFederationKibanaServices } from '../types';
import { createDatasetFormStrings } from './create_dataset_form_i18n';
import {
  validateMaxErrorRatio,
  validateMaxErrors,
  validateMaxFieldSize,
  validateSchemaSampleSize,
  type CreateDatasetFormValues,
  type DatasetBooleanFormValue,
  type DatasetFormatFormValue,
  type DatasetSchemaResolutionFormValue,
} from './create_dataset_form_state';

// ---------------------------------------------------------------------------
// Module-level option factories — shared across components so each select
// renders consistently wherever it appears.
// ---------------------------------------------------------------------------

const FORMAT_OPTIONS = () => [
  { value: '', text: createDatasetFormStrings.settingsFormatPlaceholder() },
  { value: 'csv', text: createDatasetFormStrings.settingsFormatCsv() },
  { value: 'tsv', text: createDatasetFormStrings.settingsFormatTsv() },
  { value: 'ndjson', text: createDatasetFormStrings.settingsFormatNdjson() },
  { value: 'parquet', text: createDatasetFormStrings.settingsFormatParquet() },
  // { value: 'orc', text: createDatasetFormStrings.settingsFormatOrc() },
];

const SCHEMA_RESOLUTION_OPTIONS = () => [
  { value: '', text: createDatasetFormStrings.settingsSchemaResolutionPlaceholder() },
  {
    value: 'first_file_wins',
    text: createDatasetFormStrings.settingsSchemaResolutionFirstFileWins(),
  },
  { value: 'strict', text: createDatasetFormStrings.settingsSchemaResolutionStrict() },
  {
    value: 'union_by_name',
    text: createDatasetFormStrings.settingsSchemaResolutionUnionByName(),
  },
];

const PARTITION_DETECTION_OPTIONS = () => [
  { value: '', text: createDatasetFormStrings.settingsPartitionDetectionPlaceholder() },
  { value: 'auto', text: createDatasetFormStrings.settingsPartitionDetectionAuto() },
  { value: 'hive', text: createDatasetFormStrings.settingsPartitionDetectionHive() },
  { value: 'none', text: createDatasetFormStrings.settingsPartitionDetectionNone() },
];

const ERROR_MODE_OPTIONS = () => [
  { value: '', text: createDatasetFormStrings.settingsErrorModePlaceholder() },
  { value: 'fail_fast', text: createDatasetFormStrings.settingsErrorModeFailFast() },
  { value: 'skip_row', text: createDatasetFormStrings.settingsErrorModeSkipRow() },
  { value: 'null_field', text: createDatasetFormStrings.settingsErrorModeNullField() },
];

const MODE_OPTIONS = () => [
  { value: '', text: createDatasetFormStrings.settingsModePlaceholder() },
  { value: 'quoted', text: createDatasetFormStrings.settingsModeQuoted() },
  { value: 'escaped', text: createDatasetFormStrings.settingsModeEscaped() },
  { value: 'plain', text: createDatasetFormStrings.settingsModePlain() },
];

const HEADER_ROW_OPTIONS = () => [
  { value: '', text: createDatasetFormStrings.settingsHeaderRowPlaceholder() },
  { value: 'true', text: createDatasetFormStrings.settingsHeaderRowTrue() },
  { value: 'false', text: createDatasetFormStrings.settingsHeaderRowFalse() },
];

const MULTI_VALUE_SYNTAX_OPTIONS = () => [
  { value: '', text: createDatasetFormStrings.settingsMultiValueSyntaxPlaceholder() },
  { value: 'none', text: createDatasetFormStrings.settingsMultiValueSyntaxNone() },
  { value: 'brackets', text: createDatasetFormStrings.settingsMultiValueSyntaxBrackets() },
];

const BOOLEAN_OPTIONS = (placeholder: string, enabled: string, disabled: string) => [
  { value: '', text: placeholder },
  { value: 'true', text: enabled },
  { value: 'false', text: disabled },
];

// ---------------------------------------------------------------------------
// Top-level export
// ---------------------------------------------------------------------------

export function CreateDatasetFormatField({
  control,
}: {
  control: Control<CreateDatasetFormValues>;
}) {
  const { field: formatField, fieldState: formatFieldState } = useController({
    name: 'settings.format',
    control,
    rules: {
      validate: (value) =>
        value?.trim() ? true : createDatasetFormStrings.settingsFormatRequired(),
    },
  });

  return (
    <EuiFormRow
      label={createDatasetFormStrings.settingsFormatLabel()}
      fullWidth
      isInvalid={Boolean(formatFieldState.error)}
      error={formatFieldState.error?.message}
    >
      <EuiSelect
        options={FORMAT_OPTIONS()}
        data-test-subj="createDatasetSettingsFormat"
        fullWidth
        aria-label={createDatasetFormStrings.settingsFormatLabel()}
        value={formatField.value}
        onChange={(e) => formatField.onChange(e.target.value)}
        name={formatField.name}
        inputRef={formatField.ref}
        isInvalid={Boolean(formatFieldState.error)}
      />
    </EuiFormRow>
  );
}

export function CreateDatasetPartitionDetectionField({
  control,
}: {
  control: Control<CreateDatasetFormValues>;
}) {
  const { field: partitionDetectionField } = useController({
    name: 'settings.partition_detection',
    control,
  });

  return (
    <EuiFormRow label={createDatasetFormStrings.settingsPartitionDetectionLabel()} fullWidth>
      <EuiSelect
        options={PARTITION_DETECTION_OPTIONS()}
        data-test-subj="createDatasetSettingsPartitionDetection"
        fullWidth
        aria-label={createDatasetFormStrings.settingsPartitionDetectionLabel()}
        value={partitionDetectionField.value}
        onChange={(e) => partitionDetectionField.onChange(e.target.value)}
        name={partitionDetectionField.name}
        inputRef={partitionDetectionField.ref}
      />
    </EuiFormRow>
  );
}

function DatasetSettingsHelpLink() {
  const {
    services: { docLinks },
  } = useKibana<DataFederationKibanaServices>();

  return (
    <>
      <EuiSpacer size="m" />
      <EuiText size="xs" color="subdued">
        <EuiLink href={docLinks.links.dataFederation.datasetSettings} target="_blank">
          {createDatasetFormStrings.settingsLearnMore()}
        </EuiLink>
      </EuiText>
      <EuiSpacer size="s" />
    </>
  );
}

export function CreateDatasetSettings({ control }: { control: Control<CreateDatasetFormValues> }) {
  const format = useWatch({ control, name: 'settings.format' }) as DatasetFormatFormValue;

  return (
    <>
      <EuiSpacer size="m" />
      <CreateDatasetFormatField control={control} />
      <CoreFormatSettings control={control} format={format} />
      <DatasetSettingsHelpLink />
      <UniversalAdvancedSettings control={control} />
      <FormatAdvancedSettings control={control} format={format} />
    </>
  );
}

/** Advanced settings without format or partition detection — used by the create-dataset wizard. */
export function CreateDatasetAdvancedSettings({
  control,
}: {
  control: Control<CreateDatasetFormValues>;
}) {
  const format = useWatch({ control, name: 'settings.format' }) as DatasetFormatFormValue;

  return (
    <>
      <CoreFormatSettings control={control} format={format} />
      <DatasetSettingsHelpLink />
      <RemainingUniversalSettings control={control} />
      <FormatAdvancedSettings control={control} format={format} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Core format settings — shown when CSV/TSV is selected
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

function RemainingUniversalSettings({
  control,
  partitionDetection,
}: {
  control: Control<CreateDatasetFormValues>;
  partitionDetection?: React.ReactNode;
}) {
  const { field: schemaResolutionField } = useController({
    name: 'settings.schema_resolution',
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
        label={createDatasetFormStrings.settingsSchemaResolutionLabel()}
        helpText={createDatasetFormStrings.settingsSchemaResolutionHelp()}
        fullWidth
      >
        <EuiSelect
          options={SCHEMA_RESOLUTION_OPTIONS()}
          data-test-subj="createDatasetSettingsSchemaResolution"
          fullWidth
          aria-label={createDatasetFormStrings.settingsSchemaResolutionLabel()}
          value={schemaResolutionField.value}
          onChange={(e) =>
            schemaResolutionField.onChange(e.target.value as DatasetSchemaResolutionFormValue)
          }
          name={schemaResolutionField.name}
          inputRef={schemaResolutionField.ref}
        />
      </EuiFormRow>
      {partitionDetection}
      <EuiFormRow
        label={createDatasetFormStrings.settingsPartitionPathLabel()}
        helpText={createDatasetFormStrings.settingsPartitionPathHelp()}
        fullWidth
      >
        <EuiFieldText
          data-test-subj="createDatasetSettingsPartitionPath"
          fullWidth
          value={partitionPathField.value}
          onChange={(e) => partitionPathField.onChange(e.target.value)}
          name={partitionPathField.name}
          inputRef={partitionPathField.ref}
        />
      </EuiFormRow>
      <EuiFormRow label={createDatasetFormStrings.settingsHivePartitioningLabel()} fullWidth>
        <EuiSelect
          options={BOOLEAN_OPTIONS(
            createDatasetFormStrings.settingsHivePartitioningPlaceholder(),
            createDatasetFormStrings.settingsHivePartitioningEnabled(),
            createDatasetFormStrings.settingsHivePartitioningDisabled()
          )}
          data-test-subj="createDatasetSettingsHivePartitioning"
          fullWidth
          aria-label={createDatasetFormStrings.settingsHivePartitioningLabel()}
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

function UniversalAdvancedSettings({ control }: { control: Control<CreateDatasetFormValues> }) {
  return (
    <RemainingUniversalSettings
      control={control}
      partitionDetection={<CreateDatasetPartitionDetectionField control={control} />}
    />
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
        label={createDatasetFormStrings.settingsDelimiterLabel()}
        helpText={createDatasetFormStrings.settingsDelimiterHelp()}
        fullWidth
      >
        <EuiFieldText
          data-test-subj="createDatasetSettingsDelimiter"
          fullWidth
          value={delimiterField.value}
          onChange={(e) => delimiterField.onChange(e.target.value)}
          name={delimiterField.name}
          inputRef={delimiterField.ref}
        />
      </EuiFormRow>
      <EuiFormRow label={createDatasetFormStrings.settingsModeLabel()} fullWidth>
        <EuiSelect
          options={MODE_OPTIONS()}
          data-test-subj="createDatasetSettingsMode"
          fullWidth
          aria-label={createDatasetFormStrings.settingsModeLabel()}
          value={modeField.value}
          onChange={(e) => modeField.onChange(e.target.value)}
          name={modeField.name}
          inputRef={modeField.ref}
        />
      </EuiFormRow>
      <EuiFormRow label={createDatasetFormStrings.settingsHeaderRowLabel()} fullWidth>
        <EuiSelect
          options={HEADER_ROW_OPTIONS()}
          data-test-subj="createDatasetSettingsHeaderRow"
          fullWidth
          aria-label={createDatasetFormStrings.settingsHeaderRowLabel()}
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
// CSV / TSV — remaining format fields
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
        label={createDatasetFormStrings.settingsNullValueLabel()}
        helpText={createDatasetFormStrings.settingsNullValueHelp()}
        fullWidth
      >
        <EuiFieldText
          data-test-subj="createDatasetSettingsNullValue"
          fullWidth
          value={nullValueField.value}
          onChange={(e) => nullValueField.onChange(e.target.value)}
          name={nullValueField.name}
          inputRef={nullValueField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={createDatasetFormStrings.settingsEncodingLabel()}
        helpText={createDatasetFormStrings.settingsEncodingHelp()}
        fullWidth
      >
        <EuiFieldText
          data-test-subj="createDatasetSettingsEncoding"
          fullWidth
          value={encodingField.value}
          onChange={(e) => encodingField.onChange(e.target.value)}
          name={encodingField.name}
          inputRef={encodingField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={createDatasetFormStrings.settingsSchemaSampleSizeLabel()}
        helpText={createDatasetFormStrings.settingsSchemaSampleSizeHelp()}
        fullWidth
        isInvalid={Boolean(schemaSampleSizeState.error)}
        error={schemaSampleSizeState.error?.message}
      >
        <EuiFieldNumber
          data-test-subj="createDatasetSettingsSchemaSampleSize"
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
        label={createDatasetFormStrings.settingsQuoteLabel()}
        helpText={createDatasetFormStrings.settingsQuoteHelp()}
        fullWidth
      >
        <EuiFieldText
          data-test-subj="createDatasetSettingsQuote"
          fullWidth
          value={quoteField.value}
          onChange={(e) => quoteField.onChange(e.target.value)}
          name={quoteField.name}
          inputRef={quoteField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={createDatasetFormStrings.settingsEscapeLabel()}
        helpText={createDatasetFormStrings.settingsEscapeHelp()}
        fullWidth
      >
        <EuiFieldText
          data-test-subj="createDatasetSettingsEscape"
          fullWidth
          value={escapeField.value}
          onChange={(e) => escapeField.onChange(e.target.value)}
          name={escapeField.name}
          inputRef={escapeField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={createDatasetFormStrings.settingsCommentLabel()}
        helpText={createDatasetFormStrings.settingsCommentHelp()}
        fullWidth
      >
        <EuiFieldText
          data-test-subj="createDatasetSettingsComment"
          fullWidth
          value={commentField.value}
          onChange={(e) => commentField.onChange(e.target.value)}
          name={commentField.name}
          inputRef={commentField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={createDatasetFormStrings.settingsColumnPrefixLabel()}
        helpText={createDatasetFormStrings.settingsColumnPrefixHelp()}
        fullWidth
      >
        <EuiFieldText
          data-test-subj="createDatasetSettingsColumnPrefix"
          fullWidth
          value={columnPrefixField.value}
          onChange={(e) => columnPrefixField.onChange(e.target.value)}
          name={columnPrefixField.name}
          inputRef={columnPrefixField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={createDatasetFormStrings.settingsDatetimeFormatLabel()}
        helpText={createDatasetFormStrings.settingsDatetimeFormatHelp()}
        fullWidth
      >
        <EuiFieldText
          data-test-subj="createDatasetSettingsDatetimeFormat"
          fullWidth
          value={datetimeFormatField.value}
          onChange={(e) => datetimeFormatField.onChange(e.target.value)}
          name={datetimeFormatField.name}
          inputRef={datetimeFormatField.ref}
        />
      </EuiFormRow>
      <EuiFormRow label={createDatasetFormStrings.settingsMultiValueSyntaxLabel()} fullWidth>
        <EuiSelect
          options={MULTI_VALUE_SYNTAX_OPTIONS()}
          data-test-subj="createDatasetSettingsMultiValueSyntax"
          fullWidth
          aria-label={createDatasetFormStrings.settingsMultiValueSyntaxLabel()}
          value={multiValueSyntaxField.value}
          onChange={(e) => multiValueSyntaxField.onChange(e.target.value)}
          name={multiValueSyntaxField.name}
          inputRef={multiValueSyntaxField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={createDatasetFormStrings.settingsMaxFieldSizeLabel()}
        helpText={createDatasetFormStrings.settingsMaxFieldSizeHelp()}
        fullWidth
        isInvalid={Boolean(maxFieldSizeState.error)}
        error={maxFieldSizeState.error?.message}
      >
        <EuiFieldNumber
          data-test-subj="createDatasetSettingsMaxFieldSize"
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
      <EuiFormRow label={createDatasetFormStrings.settingsErrorModeLabel()} fullWidth>
        <EuiSelect
          options={ERROR_MODE_OPTIONS()}
          data-test-subj="createDatasetSettingsErrorMode"
          fullWidth
          aria-label={createDatasetFormStrings.settingsErrorModeLabel()}
          value={errorModeField.value}
          onChange={(e) => errorModeField.onChange(e.target.value)}
          name={errorModeField.name}
          inputRef={errorModeField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={createDatasetFormStrings.settingsMaxErrorsLabel()}
        helpText={createDatasetFormStrings.settingsMaxErrorsHelp()}
        fullWidth
        isInvalid={Boolean(maxErrorsState.error)}
        error={maxErrorsState.error?.message}
      >
        <EuiFieldNumber
          data-test-subj="createDatasetSettingsMaxErrors"
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
        label={createDatasetFormStrings.settingsMaxErrorRatioLabel()}
        helpText={createDatasetFormStrings.settingsMaxErrorRatioHelp()}
        fullWidth
        isInvalid={Boolean(maxErrorRatioState.error)}
        error={maxErrorRatioState.error?.message}
      >
        <EuiFieldNumber
          data-test-subj="createDatasetSettingsMaxErrorRatio"
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
// NDJSON — remaining format fields
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
        label={createDatasetFormStrings.settingsSchemaSampleSizeLabel()}
        helpText={createDatasetFormStrings.settingsSchemaSampleSizeHelp()}
        fullWidth
        isInvalid={Boolean(schemaSampleSizeState.error)}
        error={schemaSampleSizeState.error?.message}
      >
        <EuiFieldNumber
          data-test-subj="createDatasetSettingsSchemaSampleSize"
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
        label={createDatasetFormStrings.settingsDatetimeFormatLabel()}
        helpText={createDatasetFormStrings.settingsDatetimeFormatHelp()}
        fullWidth
      >
        <EuiFieldText
          data-test-subj="createDatasetSettingsDatetimeFormat"
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

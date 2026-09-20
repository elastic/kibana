/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiCode,
  EuiFieldNumber,
  EuiFieldText,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useController, useWatch } from 'react-hook-form';

import { createDatasetWizardStrings } from './create_dataset_wizard_i18n';
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
import { ErrorModeSelect } from './form_components/error_mode_select';
import { FormatSelect } from './form_components/format_select';
import { LateMaterializationSelect } from './form_components/late_materialization_select';
import { OptimizedReaderSelect } from './form_components/optimized_reader_select';

// ---------------------------------------------------------------------------
// Module-level option arrays — shared across components so each select
// renders consistently wherever it appears.
// ---------------------------------------------------------------------------

const SCHEMA_RESOLUTION_OPTIONS = [
  { value: '', text: createDatasetWizardStrings.settingsSchemaResolutionPlaceholder },
  {
    value: 'first_file_wins',
    text: createDatasetWizardStrings.settingsSchemaResolutionFirstFileWins,
  },
  { value: 'strict', text: createDatasetWizardStrings.settingsSchemaResolutionStrict },
  {
    value: 'union_by_name',
    text: createDatasetWizardStrings.settingsSchemaResolutionUnionByName,
  },
];

const PARTITION_DETECTION_OPTIONS = [
  { value: '', text: createDatasetWizardStrings.settingsPartitionDetectionPlaceholder },
  { value: 'auto', text: createDatasetWizardStrings.settingsPartitionDetectionAuto },
  { value: 'hive', text: createDatasetWizardStrings.settingsPartitionDetectionHive },
  { value: 'none', text: createDatasetWizardStrings.settingsPartitionDetectionNone },
];

const MODE_OPTIONS = [
  { value: '', text: createDatasetWizardStrings.settingsModePlaceholder },
  { value: 'quoted', text: createDatasetWizardStrings.settingsModeQuoted },
  { value: 'escaped', text: createDatasetWizardStrings.settingsModeEscaped },
  { value: 'plain', text: createDatasetWizardStrings.settingsModePlain },
];

const HEADER_ROW_OPTIONS = [
  { value: '', text: createDatasetWizardStrings.settingsHeaderRowPlaceholder },
  { value: 'true', text: createDatasetWizardStrings.settingsHeaderRowTrue },
  { value: 'false', text: createDatasetWizardStrings.settingsHeaderRowFalse },
];

const MULTI_VALUE_SYNTAX_OPTIONS = [
  { value: '', text: createDatasetWizardStrings.settingsMultiValueSyntaxPlaceholder },
  { value: 'none', text: createDatasetWizardStrings.settingsMultiValueSyntaxNone },
  { value: 'brackets', text: createDatasetWizardStrings.settingsMultiValueSyntaxBrackets },
];

const HIVE_PARTITIONING_OPTIONS = [
  { value: '', text: createDatasetWizardStrings.settingsHivePartitioningPlaceholder },
  { value: 'true', text: createDatasetWizardStrings.settingsHivePartitioningEnabled },
  { value: 'false', text: createDatasetWizardStrings.settingsHivePartitioningDisabled },
];

const helpTextDefault = (valueLabel: string) => (
  <EuiText size="xs" color="subdued">
    <EuiCode>{valueLabel}</EuiCode> {createDatasetWizardStrings.byDefaultSuffix}
  </EuiText>
);

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
        value?.trim() ? true : createDatasetWizardStrings.settingsFormatRequired,
    },
  });

  return (
    <EuiFormRow
      label={createDatasetWizardStrings.settingsFormatLabel}
      fullWidth
      isInvalid={Boolean(formatFieldState.error)}
      error={formatFieldState.error?.message}
    >
      <FormatSelect
        value={formatField.value}
        onChange={formatField.onChange}
        onBlur={formatField.onBlur}
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
    <EuiFormRow label={createDatasetWizardStrings.settingsPartitionDetectionLabel} fullWidth>
      <EuiSelect
        options={PARTITION_DETECTION_OPTIONS}
        data-test-subj="createDatasetSettingsPartitionDetection"
        fullWidth
        aria-label={createDatasetWizardStrings.settingsPartitionDetectionLabel}
        value={partitionDetectionField.value}
        onChange={(e) => partitionDetectionField.onChange(e.target.value)}
        name={partitionDetectionField.name}
        inputRef={partitionDetectionField.ref}
      />
    </EuiFormRow>
  );
}

export function CreateDatasetSettings({ control }: { control: Control<CreateDatasetFormValues> }) {
  const format: DatasetFormatFormValue = useWatch({ control, name: 'settings.format' });

  return (
    <>
      <EuiSpacer size="m" />
      <CreateDatasetFormatField control={control} />
      <CoreFormatSettings control={control} format={format} />
      <UniversalAdvancedSettings control={control} />
      <FormatAdvancedSettings control={control} format={format} />
    </>
  );
}

/** Additional settings without format or partition detection — used by the create-dataset wizard. */
export function CreateDatasetAdditionalSettings({
  control,
}: {
  control: Control<CreateDatasetFormValues>;
}) {
  const format = useWatch({ control, name: 'settings.format' }) as DatasetFormatFormValue;
  const showParquetAdvanced = format === 'parquet';

  return (
    <>
      <EuiAccordion
        id="createDatasetWizardCommonSettings"
        buttonContent={
          <h4 style={{ margin: 0, fontWeight: 'bold' }}>
            {createDatasetWizardStrings.commonSettingsSectionTitle}
          </h4>
        }
        initialIsOpen={true}
        paddingSize="m"
      >
        <CommonOptionalSettings control={control} />
      </EuiAccordion>
      <EuiSpacer size="m" />
      {showParquetAdvanced ? (
        <EuiAccordion
          id="createDatasetWizardAdvancedSettings"
          buttonContent={
            <h4 style={{ margin: 0, fontWeight: 'bold' }}>
              {createDatasetWizardStrings.advancedSettingsSectionTitle}
            </h4>
          }
          initialIsOpen={false}
          paddingSize="m"
        >
          <ParquetSettings control={control} />
        </EuiAccordion>
      ) : null}
    </>
  );
}

function CommonOptionalSettings({ control }: { control: Control<CreateDatasetFormValues> }) {
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
        label={createDatasetWizardStrings.settingsErrorModeLabel}
        helpText={helpTextDefault('fail_fast')}
        fullWidth
      >
        <ErrorModeSelect
          value={errorModeField.value}
          onChange={errorModeField.onChange}
          onBlur={errorModeField.onBlur}
        />
      </EuiFormRow>

      <EuiFormRow
        label={createDatasetWizardStrings.settingsMaxErrorsLabel}
        helpText={helpTextDefault(createDatasetWizardStrings.unbounded)}
        fullWidth
        isInvalid={Boolean(maxErrorsState.error)}
        error={maxErrorsState.error?.message}
      >
        <EuiFieldNumber
          data-test-subj="createDatasetSettingsMaxErrors"
          fullWidth
          min={0}
          step={1}
          placeholder={createDatasetWizardStrings.settingsMaxErrorsPlaceholder}
          isInvalid={Boolean(maxErrorsState.error)}
          value={maxErrorsField.value}
          onChange={(e) => maxErrorsField.onChange(e.target.value)}
          name={maxErrorsField.name}
          inputRef={maxErrorsField.ref}
        />
      </EuiFormRow>

      <EuiFormRow
        label={createDatasetWizardStrings.settingsMaxErrorRatioLabel}
        helpText={helpTextDefault('0.0')}
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
          placeholder={createDatasetWizardStrings.settingsMaxErrorRatioPlaceholder}
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
        label={createDatasetWizardStrings.settingsSchemaResolutionLabel}
        helpText={createDatasetWizardStrings.settingsSchemaResolutionHelp}
        fullWidth
      >
        <EuiSelect
          options={SCHEMA_RESOLUTION_OPTIONS}
          data-test-subj="createDatasetSettingsSchemaResolution"
          fullWidth
          aria-label={createDatasetWizardStrings.settingsSchemaResolutionLabel}
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
        label={createDatasetWizardStrings.settingsPartitionPathLabel}
        helpText={createDatasetWizardStrings.settingsPartitionPathHelp}
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
      <EuiFormRow label={createDatasetWizardStrings.settingsHivePartitioningLabel} fullWidth>
        <EuiSelect
          options={HIVE_PARTITIONING_OPTIONS}
          data-test-subj="createDatasetSettingsHivePartitioning"
          fullWidth
          aria-label={createDatasetWizardStrings.settingsHivePartitioningLabel}
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
  if (format === 'parquet') {
    return <ParquetSettings control={control} />;
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
        label={createDatasetWizardStrings.settingsDelimiterLabel}
        helpText={createDatasetWizardStrings.settingsDelimiterHelp}
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
      <EuiFormRow label={createDatasetWizardStrings.settingsModeLabel} fullWidth>
        <EuiSelect
          options={MODE_OPTIONS}
          data-test-subj="createDatasetSettingsMode"
          fullWidth
          aria-label={createDatasetWizardStrings.settingsModeLabel}
          value={modeField.value}
          onChange={(e) => modeField.onChange(e.target.value)}
          name={modeField.name}
          inputRef={modeField.ref}
        />
      </EuiFormRow>
      <EuiFormRow label={createDatasetWizardStrings.settingsHeaderRowLabel} fullWidth>
        <EuiSelect
          options={HEADER_ROW_OPTIONS}
          data-test-subj="createDatasetSettingsHeaderRow"
          fullWidth
          aria-label={createDatasetWizardStrings.settingsHeaderRowLabel}
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

  return (
    <>
      <EuiFormRow
        label={createDatasetWizardStrings.settingsNullValueLabel}
        helpText={createDatasetWizardStrings.settingsNullValueHelp}
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
        label={createDatasetWizardStrings.settingsEncodingLabel}
        helpText={createDatasetWizardStrings.settingsEncodingHelp}
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
        label={createDatasetWizardStrings.settingsSchemaSampleSizeLabel}
        helpText={createDatasetWizardStrings.settingsSchemaSampleSizeHelp}
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
        label={createDatasetWizardStrings.settingsQuoteLabel}
        helpText={createDatasetWizardStrings.settingsQuoteHelp}
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
        label={createDatasetWizardStrings.settingsEscapeLabel}
        helpText={createDatasetWizardStrings.settingsEscapeHelp}
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
        label={createDatasetWizardStrings.settingsCommentLabel}
        helpText={createDatasetWizardStrings.settingsCommentHelp}
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
        label={createDatasetWizardStrings.settingsColumnPrefixLabel}
        helpText={createDatasetWizardStrings.settingsColumnPrefixHelp}
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
        label={createDatasetWizardStrings.settingsDatetimeFormatLabel}
        helpText={createDatasetWizardStrings.settingsDatetimeFormatHelp}
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
      <EuiFormRow label={createDatasetWizardStrings.settingsMultiValueSyntaxLabel} fullWidth>
        <EuiSelect
          options={MULTI_VALUE_SYNTAX_OPTIONS}
          data-test-subj="createDatasetSettingsMultiValueSyntax"
          fullWidth
          aria-label={createDatasetWizardStrings.settingsMultiValueSyntaxLabel}
          value={multiValueSyntaxField.value}
          onChange={(e) => multiValueSyntaxField.onChange(e.target.value)}
          name={multiValueSyntaxField.name}
          inputRef={multiValueSyntaxField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={createDatasetWizardStrings.settingsMaxFieldSizeLabel}
        helpText={createDatasetWizardStrings.settingsMaxFieldSizeHelp}
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
    </>
  );
}

function ParquetSettings({ control }: { control: Control<CreateDatasetFormValues> }) {
  return (
    <>
      <EuiSpacer size="m" />
      <EuiFormRow
        label={createDatasetWizardStrings.settingsOptimizedReaderLabel}
        helpText={helpTextDefault('true')}
        fullWidth
      >
        <OptimizedReaderSelect control={control} />
      </EuiFormRow>

      <EuiFormRow
        label={createDatasetWizardStrings.settingsLateMaterializationLabel}
        helpText={helpTextDefault('true')}
        fullWidth
      >
        <LateMaterializationSelect control={control} />
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
        label={createDatasetWizardStrings.settingsSchemaSampleSizeLabel}
        helpText={createDatasetWizardStrings.settingsSchemaSampleSizeHelp}
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
        label={createDatasetWizardStrings.settingsDatetimeFormatLabel}
        helpText={createDatasetWizardStrings.settingsDatetimeFormatHelp}
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

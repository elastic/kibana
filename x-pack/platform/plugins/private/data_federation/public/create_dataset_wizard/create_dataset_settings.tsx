/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import {
  EuiAccordion,
  EuiCode,
  EuiFieldText,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useController, useWatch } from 'react-hook-form';

import { createDatasetWizardStrings } from './create_dataset_wizard_i18n';
import {
  type CreateDatasetFormValues,
  type DatasetBooleanFormValue,
  type DatasetFormatFormValue,
  type DatasetSchemaResolutionFormValue,
  validateDelimiter,
  validatePartitionPath,
} from './create_dataset_form_state';
import { CsvTsvAdvancedSettings } from './components/csv_tsv_advanced_settings';
import { CsvTsvCommonSettings } from './components/csv_tsv_common_settings';
import { FormatSelect } from './components/format_select';
import { DelimiterSelect } from './components/delimiter_select';
import { HeaderRow } from './components/header_row';
import { QuoteMode } from './components/quote_mode';
import { NdjsonCommonSettings } from './components/ndjson_common_settings';
import { ParquetAdvancedSettings } from './components/parquet_advanced_settings';
import { ParquetCommonSettings } from './components/parquet_common_settings';
import { PartitionDetectionSelect } from './components/partition_detection_select';
import { SharedAdvancedSettings } from './components/shared_advanced_settings';
import { SharedCommonSettings } from './components/shared_common_settings';

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

const helpTextDefault = (valueLabel: string) => (
  <EuiText size="xs" color="subdued">
    <EuiCode>{valueLabel}</EuiCode> {createDatasetWizardStrings.byDefaultSuffix}
  </EuiText>
);

const HIVE_PARTITIONING_OPTIONS = [
  { value: '', text: createDatasetWizardStrings.settingsHivePartitioningPlaceholder },
  { value: 'true', text: createDatasetWizardStrings.settingsHivePartitioningEnabled },
  { value: 'false', text: createDatasetWizardStrings.settingsHivePartitioningDisabled },
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
        value?.trim() ? true : createDatasetWizardStrings.settingsFormatRequired,
    },
  });
  const { field: formatWasAutoDetectedField } = useController({
    name: 'ui.formatWasAutoDetected',
    control,
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
        onChange={(next) => {
          formatWasAutoDetectedField.onChange(false);
          formatField.onChange(next);
        }}
        onBlur={formatField.onBlur}
        isInvalid={Boolean(formatFieldState.error)}
        isAutoDetected={Boolean(formatWasAutoDetectedField.value)}
      />
    </EuiFormRow>
  );
}

export function CreateDatasetPartitionDetectionField({
  control,
}: {
  control: Control<CreateDatasetFormValues>;
}) {
  return (
    <EuiFormRow label={createDatasetWizardStrings.settingsPartitionDetectionLabel} fullWidth>
      <PartitionDetectionSelect control={control} />
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
  const format: DatasetFormatFormValue = useWatch({ control, name: 'settings.format' });
  const FormatCommonSettingsComponent = format
    ? FORMAT_COMMON_SETTING_COMPONENTS[format]
    : undefined;
  const FormatAdvancedSettingsComponent = format
    ? FORMAT_ADVANCED_SETTING_COMPONENTS[format]
    : undefined;

  // Common settings should only show if there are actual common settings for this format.
  // When no format is selected, keep the sections visible so users know where settings live.
  const hasCommonSettingsForFormat = format ? FORMAT_HAS_COMMON_SETTINGS[format] : true;
  const showCommonSettings = format ? hasCommonSettingsForFormat : true;
  const showAdvancedAsPlainContent = Boolean(format) && !hasCommonSettingsForFormat;

  return (
    <>
      {showCommonSettings ? (
        <EuiAccordion
          id="createDatasetWizardCommonSettings"
          data-test-subj="createDatasetWizardCommonSettings"
          buttonContent={
            <EuiTitle size="xxs">
              <h4>{createDatasetWizardStrings.commonSettingsSectionTitle}</h4>
            </EuiTitle>
          }
          initialIsOpen={true}
          paddingSize="m"
        >
          <SharedCommonSettings control={control} />
          {FormatCommonSettingsComponent ? (
            <FormatCommonSettingsComponent control={control} />
          ) : null}
        </EuiAccordion>
      ) : null}
      {showCommonSettings ? <EuiSpacer size="m" /> : null}
      {showAdvancedAsPlainContent ? (
        <div
          id="createDatasetWizardAdvancedSettings"
          data-test-subj="createDatasetWizardAdvancedSettings"
          style={{ padding: 16 }}
        >
          {FormatAdvancedSettingsComponent ? (
            <>
              <FormatAdvancedSettingsComponent control={control} />
              <EuiSpacer size="m" />
            </>
          ) : null}
          <SharedAdvancedSettings control={control} />
        </div>
      ) : (
        <EuiAccordion
          id="createDatasetWizardAdvancedSettings"
          data-test-subj="createDatasetWizardAdvancedSettings"
          buttonContent={
            <EuiTitle size="xxs">
              <h4>{createDatasetWizardStrings.advancedSettingsSectionTitle}</h4>
            </EuiTitle>
          }
          initialIsOpen={false}
          paddingSize="m"
        >
          {FormatAdvancedSettingsComponent ? (
            <>
              <FormatAdvancedSettingsComponent control={control} />
              <EuiSpacer size="m" />
            </>
          ) : null}
          <SharedAdvancedSettings control={control} />
        </EuiAccordion>
      )}
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
  if (format === 'csv' || format === 'tsv') {
    return <CsvTsvCoreSettings control={control} />;
  }
  if (format === 'ndjson') {
    return <NdjsonCommonSettings control={control} />;
  }
  return null;
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
  const partitionDetectionValue = useWatch({ control, name: 'settings.partition_detection' });
  const { field: schemaResolutionField } = useController({
    name: 'settings.schema_resolution',
    control,
  });
  const { field: partitionPathField, fieldState: partitionPathState } = useController({
    name: 'settings.partition_path',
    control,
    rules: { validate: validatePartitionPath },
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
      {partitionDetectionValue === 'template' ? (
        <EuiFormRow
          label={createDatasetWizardStrings.settingsPartitionPathLabel}
          helpText={createDatasetWizardStrings.settingsPartitionPathHelp}
          fullWidth
          isInvalid={Boolean(partitionPathState.error)}
          error={partitionPathState.error?.message}
        >
          <EuiFieldText
            data-test-subj="createDatasetSettingsPartitionPath"
            fullWidth
            isInvalid={Boolean(partitionPathState.error)}
            value={partitionPathField.value}
            onChange={(e) => partitionPathField.onChange(e.target.value)}
            name={partitionPathField.name}
            inputRef={partitionPathField.ref}
          />
        </EuiFormRow>
      ) : null}
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
  if (format === 'parquet') {
    return <ParquetAdvancedSettings control={control} />;
  }
  // parquet, orc, and unselected: no per-format advanced fields
  return null;
}

// ---------------------------------------------------------------------------
// CSV / TSV — core fields (shown by default)
// ---------------------------------------------------------------------------

function CsvTsvCoreSettings({ control }: { control: Control<CreateDatasetFormValues> }) {
  const format: DatasetFormatFormValue = useWatch({ control, name: 'settings.format' });
  const { field: delimiterField, fieldState: delimiterState } = useController({
    name: 'settings.delimiter',
    control,
    rules: { validate: validateDelimiter },
  });
  const { field: modeField } = useController({ name: 'settings.mode', control });
  const { field: headerRowField } = useController({ name: 'settings.header_row', control });

  return (
    <>
      <EuiSpacer size="m" />
      <EuiFormRow
        label={createDatasetWizardStrings.settingsDelimiterLabel}
        helpText={helpTextDefault(format === 'tsv' ? '\\t' : ',')}
        fullWidth
        isInvalid={Boolean(delimiterState.error)}
        error={delimiterState.error?.message}
      >
        <DelimiterSelect
          value={delimiterField.value}
          onChange={(next) => delimiterField.onChange(next)}
          onBlur={delimiterField.onBlur}
          defaultValue={format === 'tsv' ? '\t' : ','}
        />
      </EuiFormRow>
      <EuiFormRow label={createDatasetWizardStrings.settingsModeLabel} fullWidth>
        <QuoteMode
          value={modeField.value}
          onChange={(next) => modeField.onChange(next)}
          onBlur={modeField.onBlur}
        />
      </EuiFormRow>
      <EuiFormRow label={createDatasetWizardStrings.settingsHeaderRowLabel} fullWidth>
        <HeaderRow
          value={headerRowField.value}
          onChange={(next) => headerRowField.onChange(next)}
          onBlur={headerRowField.onBlur}
        />
      </EuiFormRow>
    </>
  );
}

function OrcCommonSettings(_props: { control: Control<CreateDatasetFormValues> }) {
  return <div data-test-subj="createDatasetOrcCommonSettings" />;
}

function OrcAdvancedSettings(_props: { control: Control<CreateDatasetFormValues> }) {
  return <div data-test-subj="createDatasetOrcAdvancedSettings" />;
}

function NdjsonAdvancedSettings(_props: { control: Control<CreateDatasetFormValues> }) {
  return null;
}

const FORMAT_HAS_COMMON_SETTINGS: Record<Exclude<DatasetFormatFormValue, ''>, boolean> = {
  csv: true,
  tsv: true,
  ndjson: true,
  parquet: false,
  orc: false,
};

const FORMAT_COMMON_SETTING_COMPONENTS: Record<
  Exclude<DatasetFormatFormValue, ''>,
  FunctionComponent<{ control: Control<CreateDatasetFormValues> }>
> = {
  csv: CsvTsvCommonSettings,
  tsv: CsvTsvCommonSettings,
  ndjson: NdjsonCommonSettings,
  parquet: ParquetCommonSettings,
  orc: OrcCommonSettings,
};

const FORMAT_ADVANCED_SETTING_COMPONENTS: Record<
  Exclude<DatasetFormatFormValue, ''>,
  FunctionComponent<{ control: Control<CreateDatasetFormValues> }>
> = {
  csv: CsvTsvAdvancedSettings,
  tsv: CsvTsvAdvancedSettings,
  ndjson: NdjsonAdvancedSettings,
  parquet: ParquetAdvancedSettings,
  orc: OrcAdvancedSettings,
};

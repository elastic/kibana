/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { EuiAccordion, EuiFieldText, EuiFormRow, EuiSelect, EuiSpacer } from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useController, useWatch } from 'react-hook-form';

import { createDatasetWizardStrings } from './create_dataset_wizard_i18n';
import {
  type CreateDatasetFormValues,
  type DatasetBooleanFormValue,
  type DatasetFormatFormValue,
  type DatasetSchemaResolutionFormValue,
} from './create_dataset_form_state';
import { CsvTsvAdvancedSettings } from './form_components/csv_tsv_advanced_settings';
import { CsvTsvCommonSettings } from './form_components/csv_tsv_common_settings';
import { FormatSelect } from './form_components/format_select';
import { NdjsonCommonSettings } from './form_components/ndjson_common_settings';
import { ParquetAdvancedSettings } from './form_components/parquet_advanced_settings';
import { ParquetCommonSettings } from './form_components/parquet_common_settings';
import { PartitionDetectionSelect } from './form_components/partition_detection_select';
import { SharedAdvancedSettings } from './form_components/shared_advanced_settings';
import { SharedCommonSettings } from './form_components/shared_common_settings';

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

  return (
    <>
      <EuiAccordion
        id="createDatasetWizardCommonSettings"
        data-test-subj="createDatasetWizardCommonSettings"
        buttonContent={
          <h4 style={{ margin: 0, fontWeight: 'bold' }}>
            {createDatasetWizardStrings.commonSettingsSectionTitle}
          </h4>
        }
        initialIsOpen={true}
        paddingSize="m"
      >
        <SharedCommonSettings control={control} />
        {FormatCommonSettingsComponent ? <FormatCommonSettingsComponent control={control} /> : null}
      </EuiAccordion>
      <EuiSpacer size="m" />
      <EuiAccordion
        id="createDatasetWizardAdvancedSettings"
        data-test-subj="createDatasetWizardAdvancedSettings"
        buttonContent={
          <h4 style={{ margin: 0, fontWeight: 'bold' }}>
            {createDatasetWizardStrings.advancedSettingsSectionTitle}
          </h4>
        }
        initialIsOpen={false}
        paddingSize="m"
      >
        <SharedAdvancedSettings control={control} />
        {FormatAdvancedSettingsComponent ? (
          <FormatAdvancedSettingsComponent control={control} />
        ) : null}
      </EuiAccordion>
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

function OrcCommonSettings(_props: { control: Control<CreateDatasetFormValues> }) {
  return <div data-test-subj="createDatasetOrcCommonSettings" />;
}

function OrcAdvancedSettings(_props: { control: Control<CreateDatasetFormValues> }) {
  return <div data-test-subj="createDatasetOrcAdvancedSettings" />;
}

function NdjsonAdvancedSettings(_props: { control: Control<CreateDatasetFormValues> }) {
  return null;
}

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

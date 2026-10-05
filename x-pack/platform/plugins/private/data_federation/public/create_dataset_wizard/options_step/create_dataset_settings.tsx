/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FunctionComponent } from 'react';
import { EuiAccordion, EuiFormRow, EuiSpacer, EuiTitle } from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useController, useWatch } from 'react-hook-form';

import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';
import {
  type CreateDatasetFormValues,
  type DatasetFormatFormValue,
} from '../create_dataset_form_state';
import { CsvTsvAdvancedSettings } from './csv_tsv/csv_tsv_advanced_settings';
import { CsvTsvCommonSettings } from './csv_tsv/csv_tsv_common_settings';
import { FormatSelect } from '../define_step/fields/format_select';

import { NdjsonCommonSettings } from './ndjson/ndjson_common_settings';
import { ParquetAdvancedSettings } from './parquet/parquet_advanced_settings';
import { ParquetCommonSettings } from './parquet/parquet_common_settings';
import { SharedAdvancedSettings } from './all_types/shared_advanced_settings';
import { SharedCommonSettings } from './all_types/shared_common_settings';

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

/** Additional settings without format or partition detection — used by the create-dataset wizard. */
export function CreateDatasetAdditionalSettings({
  control,
}: {
  control: Control<CreateDatasetFormValues>;
}) {
  const { field: commonAccordionField } = useController({
    name: 'ui.additionalCommonSettingsIsOpen',
    control,
  });
  const { field: advancedAccordionField } = useController({
    name: 'ui.additionalAdvancedSettingsIsOpen',
    control,
  });
  const commonAccordionIsOpen = Boolean(commonAccordionField.value);
  const advancedAccordionIsOpen = Boolean(advancedAccordionField.value);

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

  const advancedSettingsContent = (
    <>
      {FormatAdvancedSettingsComponent ? (
        <>
          <FormatAdvancedSettingsComponent control={control} />
          <EuiSpacer size="m" />
        </>
      ) : null}
      <SharedAdvancedSettings control={control} />
    </>
  );

  return (
    <>
      {showCommonSettings ? (
        <>
          <EuiAccordion
            id="createDatasetWizardCommonSettings"
            data-test-subj="createDatasetWizardCommonSettings"
            buttonContent={
              <EuiTitle size="xxs">
                <h4>{createDatasetWizardStrings.commonSettingsSectionTitle}</h4>
              </EuiTitle>
            }
            initialIsOpen={commonAccordionIsOpen}
            forceState={commonAccordionIsOpen ? 'open' : 'closed'}
            onToggle={(nextIsOpen) => commonAccordionField.onChange(nextIsOpen)}
            paddingSize="m"
          >
            <SharedCommonSettings control={control} />
            {FormatCommonSettingsComponent ? (
              <FormatCommonSettingsComponent control={control} />
            ) : null}
          </EuiAccordion>
          <EuiSpacer size="m" />
        </>
      ) : null}
      {showAdvancedAsPlainContent ? (
        <div
          id="createDatasetWizardAdvancedSettings"
          data-test-subj="createDatasetWizardAdvancedSettings"
          style={{ padding: 16 }}
        >
          {advancedSettingsContent}
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
          initialIsOpen={advancedAccordionIsOpen}
          forceState={advancedAccordionIsOpen ? 'open' : 'closed'}
          onToggle={(nextIsOpen) => advancedAccordionField.onChange(nextIsOpen)}
          paddingSize="m"
        >
          {advancedSettingsContent}
        </EuiAccordion>
      )}
    </>
  );
}

function NdjsonAdvancedSettings(_props: { control: Control<CreateDatasetFormValues> }) {
  return null;
}

const FORMAT_HAS_COMMON_SETTINGS: Record<Exclude<DatasetFormatFormValue, ''>, boolean> = {
  csv: true,
  tsv: true,
  ndjson: true,
  parquet: false,
};

const FORMAT_COMMON_SETTING_COMPONENTS: Record<
  Exclude<DatasetFormatFormValue, ''>,
  FunctionComponent<{ control: Control<CreateDatasetFormValues> }>
> = {
  csv: CsvTsvCommonSettings,
  tsv: CsvTsvCommonSettings,
  ndjson: NdjsonCommonSettings,
  parquet: ParquetCommonSettings,
};

const FORMAT_ADVANCED_SETTING_COMPONENTS: Record<
  Exclude<DatasetFormatFormValue, ''>,
  FunctionComponent<{ control: Control<CreateDatasetFormValues> }>
> = {
  csv: CsvTsvAdvancedSettings,
  tsv: CsvTsvAdvancedSettings,
  ndjson: NdjsonAdvancedSettings,
  parquet: ParquetAdvancedSettings,
};

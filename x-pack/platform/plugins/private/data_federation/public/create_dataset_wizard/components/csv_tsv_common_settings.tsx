/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode, EuiFieldNumber, EuiFieldText, EuiFormRow, EuiText } from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useController, useWatch } from 'react-hook-form';

import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';
import {
  DEFAULT_DATETIME_FORMAT_LABEL,
  DEFAULT_ENCODING,
  validateDelimiter,
  validateSkipRows,
  type CreateDatasetFormValues,
  type DatasetFormatFormValue,
} from '../create_dataset_form_state';
import { DatetimeFormatSelect } from './datetime_format_select';
import { DelimiterSelect } from './delimiter_select';
import { EncodingSelect } from './encoding_select';
import { HeaderRow } from './header_row';
import { FormRowLabelWithInfo } from './form_row_label_with_info';
import { QuoteMode } from './quote_mode';

const helpTextDefault = (valueLabel: string) => (
  <EuiText size="xs" color="subdued">
    <EuiCode>{valueLabel}</EuiCode> {createDatasetWizardStrings.byDefaultSuffix}
  </EuiText>
);

export function CsvTsvCommonSettings({ control }: { control: Control<CreateDatasetFormValues> }) {
  const format: DatasetFormatFormValue = useWatch({ control, name: 'settings.format' });
  const { field: delimiterField, fieldState: delimiterState } = useController({
    name: 'settings.delimiter',
    control,
    rules: { validate: validateDelimiter },
  });
  const { field: modeField } = useController({ name: 'settings.mode', control });
  const { field: headerRowField } = useController({ name: 'settings.header_row', control });
  const { field: skipRowsField, fieldState: skipRowsState } = useController({
    name: 'settings.skip_rows',
    control,
    rules: { validate: validateSkipRows },
  });
  const { field: nullValueField } = useController({ name: 'settings.null_value', control });

  return (
    <div data-test-subj="createDatasetCsvTsvCommonSettings">
      <EuiFormRow
        label={
          <FormRowLabelWithInfo
            label={createDatasetWizardStrings.settingsDelimiterLabel}
            infoText={createDatasetWizardStrings.settingsDelimiterDescription}
          />
        }
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
      <EuiFormRow
        label={
          <FormRowLabelWithInfo
            label={createDatasetWizardStrings.settingsModeLabel}
            infoText={createDatasetWizardStrings.settingsQuoteModeDescription}
          />
        }
        fullWidth
      >
        <QuoteMode
          value={modeField.value}
          onChange={(next) => modeField.onChange(next)}
          onBlur={modeField.onBlur}
        />
      </EuiFormRow>
      <EuiFormRow
        label={
          <FormRowLabelWithInfo
            label={createDatasetWizardStrings.settingsHeaderRowLabel}
            infoText={createDatasetWizardStrings.settingsHeaderRowDescription}
          />
        }
        fullWidth
      >
        <HeaderRow
          value={headerRowField.value}
          onChange={(next) => headerRowField.onChange(next)}
          onBlur={headerRowField.onBlur}
        />
      </EuiFormRow>
      <EuiFormRow
        label={
          <FormRowLabelWithInfo
            label={createDatasetWizardStrings.settingsSkipRowsLabel}
            infoText={createDatasetWizardStrings.settingsSkipRowsDescription}
          />
        }
        helpText={createDatasetWizardStrings.settingsSkipRowsHelp}
        fullWidth
        isInvalid={Boolean(skipRowsState.error)}
        error={skipRowsState.error?.message}
      >
        <EuiFieldNumber
          data-test-subj="createDatasetSettingsSkipRows"
          fullWidth
          min={0}
          max={1000}
          step={1}
          isInvalid={Boolean(skipRowsState.error)}
          value={skipRowsField.value}
          onChange={(e) => skipRowsField.onChange(e.target.value)}
          name={skipRowsField.name}
          inputRef={skipRowsField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={
          <FormRowLabelWithInfo
            label={createDatasetWizardStrings.settingsDatetimeFormatLabel}
            infoText={createDatasetWizardStrings.settingsDatetimeFormatDescription}
          />
        }
        helpText={helpTextDefault(DEFAULT_DATETIME_FORMAT_LABEL)}
        fullWidth
      >
        <DatetimeFormatSelect control={control} />
      </EuiFormRow>
      <EuiFormRow
        label={
          <FormRowLabelWithInfo
            label={createDatasetWizardStrings.settingsNullValueLabel}
            infoText={createDatasetWizardStrings.settingsNullValueDescription}
          />
        }
        helpText={helpTextDefault(createDatasetWizardStrings.emptyString)}
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
        label={
          <FormRowLabelWithInfo
            label={createDatasetWizardStrings.settingsEncodingLabel}
            infoText={createDatasetWizardStrings.settingsEncodingHelp}
          />
        }
        helpText={helpTextDefault(DEFAULT_ENCODING)}
        fullWidth
      >
        <EncodingSelect control={control} />
      </EuiFormRow>
    </div>
  );
}

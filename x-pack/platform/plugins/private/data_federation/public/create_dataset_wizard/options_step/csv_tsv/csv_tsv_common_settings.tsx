/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiCode, EuiFieldText, EuiFormRow } from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useController, useWatch } from 'react-hook-form';
import { FormattedMessage } from '@kbn/i18n-react';

import { createDatasetWizardStrings } from '../../create_dataset_wizard_i18n';
import {
  validateDelimiter,
  validateDistinctCsvCharacter,
  type CreateDatasetFormValues,
  type DatasetFormatFormValue,
} from '../../create_dataset_form_state';
import { DatetimeFormatSelect } from '../../components/fields/datetime_format_select';
import { DatetimeFormatHelpText } from '../../components/datetime_format_help_text';
import { DelimiterSelect } from './fields/delimiter_select';
import { EncodingSelect } from './fields/encoding_select';
import { HeaderRow } from './fields/header_row';
import { FormRowLabelWithInfo } from '../../components/form_row_label_with_info';
import { QuoteMode } from './fields/quote_mode';
import { SkipRowsField } from './fields/skip_rows_field';

export function CsvTsvCommonSettings({ control }: { control: Control<CreateDatasetFormValues> }) {
  const format: DatasetFormatFormValue = useWatch({ control, name: 'settings.format' });
  const { field: delimiterField, fieldState: delimiterState } = useController({
    name: 'settings.delimiter',
    control,
    rules: {
      validate: { format: validateDelimiter, distinct: validateDistinctCsvCharacter('delimiter') },
      deps: ['settings.quote', 'settings.escape'],
    },
  });
  const { field: modeField, fieldState: modeState } = useController({
    name: 'settings.mode',
    control,
    rules: {
      validate: (_value, { ui }) =>
        ui.modeIsValid === false ? createDatasetWizardStrings.comboBoxSelectValidOption : true,
      deps: ['settings.delimiter', 'settings.quote', 'settings.escape'],
    },
  });
  const {
    field: { onChange: setModeIsValid },
  } = useController({ name: 'ui.modeIsValid', control });

  const { field: headerRowField, fieldState: headerRowState } = useController({
    name: 'settings.header_row',
    control,
    rules: {
      validate: (_value, { ui }) =>
        ui.headerRowIsValid === false ? createDatasetWizardStrings.comboBoxSelectValidOption : true,
    },
  });
  const {
    field: { onChange: setHeaderRowIsValid },
  } = useController({ name: 'ui.headerRowIsValid', control });

  // The combo boxes' typed text does not survive unmounting, so neither should the flags that reflect it.
  useEffect(
    () => () => {
      setModeIsValid(true);
      setHeaderRowIsValid(true);
    },
    [setModeIsValid, setHeaderRowIsValid]
  );
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
        helpText={
          <FormattedMessage
            id="xpack.dataFederation.createDatasetForm.settingsDelimiterHelp"
            defaultMessage="{defaultValue} by default"
            values={{ defaultValue: <EuiCode>{format === 'tsv' ? '\\t' : ','}</EuiCode> }}
          />
        }
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
        helpText={
          <FormattedMessage
            id="xpack.dataFederation.createDatasetForm.settingsModeHelp"
            defaultMessage="{defaultValue} by default"
            values={{ defaultValue: <EuiCode>{format === 'tsv' ? 'plain' : 'quoted'}</EuiCode> }}
          />
        }
        fullWidth
        isInvalid={Boolean(modeState.error)}
        error={modeState.error?.message}
      >
        <QuoteMode
          value={modeField.value}
          onChange={({ value, isValid }) => {
            modeField.onChange(value);
            setModeIsValid(isValid);
          }}
          onBlur={modeField.onBlur}
          isInvalid={Boolean(modeState.error)}
          defaultValue={format === 'tsv' ? 'plain' : 'quoted'}
        />
      </EuiFormRow>
      <EuiFormRow
        label={
          <FormRowLabelWithInfo
            label={createDatasetWizardStrings.settingsHeaderRowLabel}
            infoText={createDatasetWizardStrings.settingsHeaderRowDescription}
          />
        }
        helpText={
          <FormattedMessage
            id="xpack.dataFederation.createDatasetForm.settingsHeaderRowHelp"
            defaultMessage="{trueValue} by default"
            values={{ trueValue: <EuiCode>true</EuiCode> }}
          />
        }
        fullWidth
        isInvalid={Boolean(headerRowState.error)}
        error={headerRowState.error?.message}
      >
        <HeaderRow
          value={headerRowField.value}
          onChange={({ value, isValid }) => {
            headerRowField.onChange(value);
            setHeaderRowIsValid(isValid);
          }}
          onBlur={headerRowField.onBlur}
          isInvalid={Boolean(headerRowState.error)}
        />
      </EuiFormRow>
      <SkipRowsField control={control} />
      <EuiFormRow
        label={
          <FormRowLabelWithInfo
            label={createDatasetWizardStrings.settingsDatetimeFormatLabel}
            infoText={createDatasetWizardStrings.settingsDatetimeFormatDescription}
          />
        }
        helpText={<DatetimeFormatHelpText />}
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
        helpText={
          <FormattedMessage
            id="xpack.dataFederation.createDatasetForm.settingsNullValueHelp"
            defaultMessage="{empty} by default"
            values={{ empty: <EuiCode>empty</EuiCode> }}
          />
        }
        fullWidth
      >
        <EuiFieldText
          data-test-subj="createDatasetSettingsNullValue"
          fullWidth
          placeholder={createDatasetWizardStrings.settingsNullValuePlaceholder}
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
            infoText={createDatasetWizardStrings.settingsEncodingDescription}
          />
        }
        helpText={
          <FormattedMessage
            id="xpack.dataFederation.createDatasetForm.settingsEncodingHelp"
            defaultMessage="{defaultValue} by default"
            values={{ defaultValue: <EuiCode>UTF-8</EuiCode> }}
          />
        }
        fullWidth
      >
        <EncodingSelect control={control} />
      </EuiFormRow>
    </div>
  );
}

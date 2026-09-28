/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode, EuiFieldText, EuiFormRow } from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useController, useWatch } from 'react-hook-form';
import { FormattedMessage } from '@kbn/i18n-react';

import { createDatasetWizardStrings } from '../../create_dataset_wizard_i18n';
import {
  validateDelimiter,
  type CreateDatasetFormValues,
  type DatasetFormatFormValue,
} from '../../create_dataset_form_state';
import { DatetimeFormatSelect } from '../../components/fields/datetime_format_select';
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
    rules: { validate: validateDelimiter },
  });
  const { field: modeField } = useController({ name: 'settings.mode', control });
  const { field: headerRowField } = useController({ name: 'settings.header_row', control });
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
        helpText={createDatasetWizardStrings.settingsDelimiterHelp}
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
        label={createDatasetWizardStrings.settingsModeLabel}
        helpText={createDatasetWizardStrings.settingsQuoteModeDescription}
        fullWidth
      >
        <QuoteMode
          value={modeField.value}
          onChange={(next) => modeField.onChange(next)}
          onBlur={modeField.onBlur}
          defaultValue={format === 'tsv' ? 'plain' : 'quoted'}
        />
      </EuiFormRow>
      <EuiFormRow
        label={createDatasetWizardStrings.settingsHeaderRowLabel}
        helpText={createDatasetWizardStrings.settingsHeaderRowHelp}
        fullWidth
      >
        <HeaderRow
          value={headerRowField.value}
          onChange={(next) => headerRowField.onChange(next)}
          onBlur={headerRowField.onBlur}
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
        helpText={
          <FormattedMessage
            id="xpack.dataFederation.createDatasetForm.settingsDatetimeFormatHelpText"
            defaultMessage="If left blank, defaults to {defaultValue}."
            values={{ defaultValue: <EuiCode>ISO-8601</EuiCode> }}
          />
        }
        fullWidth
      >
        <DatetimeFormatSelect control={control} />
      </EuiFormRow>
      <EuiFormRow
        label={
          <FormRowLabelWithInfo
            label={createDatasetWizardStrings.settingsNullValueLabel}
            infoText={
              <FormattedMessage
                id="xpack.dataFederation.createDatasetWizard.additionalSettings.nullValue.descriptionText"
                defaultMessage="Enter the value your files use for missing data. For example: {nullValue} or {naValue}. When set, empty fields are no longer treated as null."
                values={{
                  nullValue: <EuiCode>NULL</EuiCode>,
                  naValue: <EuiCode>NA</EuiCode>,
                }}
              />
            }
          />
        }
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
        <EncodingSelect control={control} />
      </EuiFormRow>
    </div>
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCode, EuiFieldText, EuiFormRow } from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useController, useWatch } from 'react-hook-form';

import { CSV_CHARACTER_NONE } from '../../../../common';
import { createDatasetWizardStrings } from '../../create_dataset_wizard_i18n';
import {
  DEFAULT_COLUMN_PREFIX,
  validateDistinctCsvCharacter,
  validateEscapeCharacter,
  validateQuoteCharacter,
  type CreateDatasetFormValues,
  type DatasetFormatFormValue,
} from '../../create_dataset_form_state';
import { FormRowLabelWithInfo } from '../../components/form_row_label_with_info';
import { TrimSpaces } from './fields/trim_spaces';

export function CsvTsvAdvancedSettings({ control }: { control: Control<CreateDatasetFormValues> }) {
  const format: DatasetFormatFormValue = useWatch({ control, name: 'settings.format' });
  const { field: quoteField, fieldState: quoteState } = useController({
    name: 'settings.quote',
    control,
    rules: {
      validate: { format: validateQuoteCharacter, distinct: validateDistinctCsvCharacter('quote') },
      deps: ['settings.delimiter', 'settings.escape'],
    },
  });
  const { field: escapeField, fieldState: escapeState } = useController({
    name: 'settings.escape',
    control,
    rules: {
      validate: {
        format: validateEscapeCharacter,
        distinct: validateDistinctCsvCharacter('escape'),
      },
      deps: ['settings.delimiter', 'settings.quote'],
    },
  });
  const { field: columnPrefixField } = useController({ name: 'settings.column_prefix', control });
  const { field: trimSpacesField, fieldState: trimSpacesState } = useController({
    name: 'settings.trim_spaces',
    control,
    rules: {
      validate: (_value, { ui }) =>
        ui.trimSpacesIsValid === false
          ? createDatasetWizardStrings.comboBoxSelectValidOption
          : true,
    },
  });
  const {
    field: { onChange: setTrimSpacesIsValid },
  } = useController({ name: 'ui.trimSpacesIsValid', control });

  // The combo box's typed text does not survive unmounting, so neither should the flag that reflects it.
  useEffect(() => () => setTrimSpacesIsValid(true), [setTrimSpacesIsValid]);

  return (
    <div data-test-subj="createDatasetCsvTsvAdvancedSettings">
      <EuiFormRow
        label={
          <FormRowLabelWithInfo
            label={createDatasetWizardStrings.settingsQuoteLabel}
            infoText={
              <FormattedMessage
                id="xpack.dataFederation.createDatasetWizard.additionalSettings.quoteCharacter.descriptionTextWithNone"
                defaultMessage="Character that surrounds field values. Enter {none} to turn off quoting. Overrides {quoteMode} in {commonSettings}."
                values={{
                  none: <EuiCode>{CSV_CHARACTER_NONE}</EuiCode>,
                  quoteMode: <strong>{createDatasetWizardStrings.settingsModeLabel}</strong>,
                  commonSettings: (
                    <strong>{createDatasetWizardStrings.commonSettingsReference}</strong>
                  ),
                }}
              />
            }
          />
        }
        helpText={
          format === 'tsv' ? (
            <FormattedMessage
              id="xpack.dataFederation.createDatasetForm.settingsQuoteTsvHelpText"
              defaultMessage="{empty} by default"
              values={{ empty: <EuiCode>empty</EuiCode> }}
            />
          ) : (
            <FormattedMessage
              id="xpack.dataFederation.createDatasetForm.settingsQuoteHelpText"
              defaultMessage="{quote} by default"
              values={{ quote: <EuiCode>&quot;</EuiCode> }}
            />
          )
        }
        fullWidth
        isInvalid={Boolean(quoteState.error)}
        error={quoteState.error?.message}
      >
        <EuiFieldText
          data-test-subj="createDatasetSettingsQuote"
          fullWidth
          placeholder={createDatasetWizardStrings.settingsQuotePlaceholder}
          maxLength={CSV_CHARACTER_NONE.length}
          isInvalid={Boolean(quoteState.error)}
          value={quoteField.value}
          onChange={(e) => quoteField.onChange(e.target.value)}
          name={quoteField.name}
          inputRef={quoteField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={
          <FormRowLabelWithInfo
            label={createDatasetWizardStrings.settingsEscapeLabel}
            infoText={
              <FormattedMessage
                id="xpack.dataFederation.createDatasetWizard.additionalSettings.escapeCharacter.descriptionTextWithNone"
                defaultMessage="Character used to escape special characters. Enter {none} to turn off escaping. Overrides {quoteMode} in {commonSettings}."
                values={{
                  none: <EuiCode>{CSV_CHARACTER_NONE}</EuiCode>,
                  quoteMode: <strong>{createDatasetWizardStrings.settingsModeLabel}</strong>,
                  commonSettings: (
                    <strong>{createDatasetWizardStrings.commonSettingsReference}</strong>
                  ),
                }}
              />
            }
          />
        }
        helpText={
          format === 'tsv' ? (
            <FormattedMessage
              id="xpack.dataFederation.createDatasetForm.settingsEscapeTsvHelpText"
              defaultMessage="{empty} by default"
              values={{ empty: <EuiCode>empty</EuiCode> }}
            />
          ) : (
            <FormattedMessage
              id="xpack.dataFederation.createDatasetForm.settingsEscapeHelpText"
              defaultMessage="{escape} by default"
              values={{ escape: <EuiCode>\</EuiCode> }}
            />
          )
        }
        fullWidth
        isInvalid={Boolean(escapeState.error)}
        error={escapeState.error?.message}
      >
        <EuiFieldText
          data-test-subj="createDatasetSettingsEscape"
          fullWidth
          placeholder={createDatasetWizardStrings.settingsEscapePlaceholder}
          maxLength={CSV_CHARACTER_NONE.length}
          isInvalid={Boolean(escapeState.error)}
          value={escapeField.value}
          onChange={(e) => escapeField.onChange(e.target.value)}
          name={escapeField.name}
          inputRef={escapeField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={
          <FormRowLabelWithInfo
            label={createDatasetWizardStrings.settingsColumnPrefixLabel}
            infoText={createDatasetWizardStrings.settingsColumnPrefixDescription}
          />
        }
        helpText={
          <FormattedMessage
            id="xpack.dataFederation.createDatasetForm.settingsColumnPrefixHelpText"
            defaultMessage="{defaultValue} by default"
            values={{ defaultValue: <EuiCode>{DEFAULT_COLUMN_PREFIX}</EuiCode> }}
          />
        }
        fullWidth
      >
        <EuiFieldText
          data-test-subj="createDatasetSettingsColumnPrefix"
          fullWidth
          placeholder={createDatasetWizardStrings.settingsColumnPrefixPlaceholder}
          value={columnPrefixField.value}
          onChange={(e) => columnPrefixField.onChange(e.target.value)}
          name={columnPrefixField.name}
          inputRef={columnPrefixField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={
          <FormRowLabelWithInfo
            label={createDatasetWizardStrings.settingsTrimSpacesLabel}
            infoText={createDatasetWizardStrings.settingsTrimSpacesDescription}
          />
        }
        helpText={
          <FormattedMessage
            id="xpack.dataFederation.createDatasetForm.settingsTrimSpacesHelp"
            defaultMessage="{falseValue} by default"
            values={{ falseValue: <EuiCode>false</EuiCode> }}
          />
        }
        fullWidth
        isInvalid={Boolean(trimSpacesState.error)}
        error={trimSpacesState.error?.message}
      >
        <TrimSpaces
          value={trimSpacesField.value}
          onChange={({ value, isValid }) => {
            trimSpacesField.onChange(value);
            setTrimSpacesIsValid(isValid);
          }}
          onBlur={trimSpacesField.onBlur}
          isInvalid={Boolean(trimSpacesState.error)}
        />
      </EuiFormRow>
    </div>
  );
}

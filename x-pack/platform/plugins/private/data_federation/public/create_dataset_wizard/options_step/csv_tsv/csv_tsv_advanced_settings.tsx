/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCode, EuiFieldText, EuiFormRow } from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useController, useWatch } from 'react-hook-form';

import { createDatasetWizardStrings } from '../../create_dataset_wizard_i18n';
import {
  DEFAULT_COLUMN_PREFIX,
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
    rules: { validate: validateQuoteCharacter },
  });
  const { field: escapeField, fieldState: escapeState } = useController({
    name: 'settings.escape',
    control,
    rules: { validate: validateEscapeCharacter },
  });
  const { field: columnPrefixField } = useController({ name: 'settings.column_prefix', control });
  const { field: trimSpacesField } = useController({ name: 'settings.trim_spaces', control });

  return (
    <div data-test-subj="createDatasetCsvTsvAdvancedSettings">
      <EuiFormRow
        label={
          <FormRowLabelWithInfo
            label={createDatasetWizardStrings.settingsQuoteLabel}
            infoText={
              <FormattedMessage
                id="xpack.dataFederation.createDatasetWizard.additionalSettings.quoteCharacter.descriptionText"
                defaultMessage="Character that surrounds field values. Overrides {quoteMode} in {commonSettings}."
                values={{
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
          maxLength={1}
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
                id="xpack.dataFederation.createDatasetWizard.additionalSettings.escapeCharacter.descriptionText"
                defaultMessage="Character used to escape special characters. Overrides {quoteMode} in {commonSettings}."
                values={{
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
          maxLength={2}
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
        label={createDatasetWizardStrings.settingsTrimSpacesLabel}
        helpText={createDatasetWizardStrings.settingsTrimSpacesHelp}
        fullWidth
      >
        <TrimSpaces
          value={trimSpacesField.value}
          onChange={(next) => trimSpacesField.onChange(next)}
          onBlur={trimSpacesField.onBlur}
        />
      </EuiFormRow>
    </div>
  );
}

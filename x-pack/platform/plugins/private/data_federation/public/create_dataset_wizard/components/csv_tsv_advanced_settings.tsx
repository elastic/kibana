/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode, EuiFieldText, EuiFormRow, EuiText } from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useController, useWatch } from 'react-hook-form';

import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';
import {
  DEFAULT_COLUMN_PREFIX,
  DEFAULT_CSV_ESCAPE,
  DEFAULT_CSV_QUOTE,
  validateEscapeCharacter,
  validateQuoteCharacter,
  type CreateDatasetFormValues,
  type DatasetFormatFormValue,
} from '../create_dataset_form_state';
import { FormRowLabelWithInfo } from './form_row_label_with_info';
import { TrimSpaces } from './trim_spaces';

const helpTextDefault = (valueLabel: string) => (
  <EuiText size="xs" color="subdued">
    <EuiCode>{valueLabel}</EuiCode> {createDatasetWizardStrings.byDefaultSuffix}
  </EuiText>
);

export function CsvTsvAdvancedSettings({ control }: { control: Control<CreateDatasetFormValues> }) {
  const format: DatasetFormatFormValue = useWatch({ control, name: 'settings.format' });
  const isCsv = format === 'csv';
  const quoteDefaultLabel = isCsv ? DEFAULT_CSV_QUOTE : createDatasetWizardStrings.noneLabel;
  const escapeDefaultLabel = isCsv ? DEFAULT_CSV_ESCAPE : createDatasetWizardStrings.noneLabel;

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
            infoText={createDatasetWizardStrings.settingsQuoteCharacterDescription}
          />
        }
        helpText={helpTextDefault(quoteDefaultLabel)}
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
            infoText={createDatasetWizardStrings.settingsEscapeHelp}
          />
        }
        helpText={helpTextDefault(escapeDefaultLabel)}
        fullWidth
        isInvalid={Boolean(escapeState.error)}
        error={escapeState.error?.message}
      >
        <EuiFieldText
          data-test-subj="createDatasetSettingsEscape"
          fullWidth
          placeholder={createDatasetWizardStrings.settingsEscapePlaceholder}
          maxLength={1}
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
            infoText={createDatasetWizardStrings.settingsColumnPrefixHelp}
          />
        }
        helpText={helpTextDefault(DEFAULT_COLUMN_PREFIX)}
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';
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

  React.useEffect(() => {
    if (format === 'csv') {
      if (!quoteField.value) quoteField.onChange(DEFAULT_CSV_QUOTE);
      if (!escapeField.value) escapeField.onChange(DEFAULT_CSV_ESCAPE);
    }
    if (format === 'tsv') {
      if (quoteField.value === DEFAULT_CSV_QUOTE) quoteField.onChange('');
      if (escapeField.value === DEFAULT_CSV_ESCAPE) escapeField.onChange('');
    }
    if ((format === 'csv' || format === 'tsv') && !columnPrefixField.value) {
      columnPrefixField.onChange(DEFAULT_COLUMN_PREFIX);
    }
  }, [columnPrefixField, escapeField, format, quoteField]);

  return (
    <div data-test-subj="createDatasetCsvTsvAdvancedSettings">
      <EuiFormRow
        label={
          <FormRowLabelWithInfo
            label={createDatasetWizardStrings.settingsQuoteLabel}
            infoText={createDatasetWizardStrings.settingsQuoteCharacterDescription}
          />
        }
        helpText={createDatasetWizardStrings.settingsQuoteHelp}
        fullWidth
        isInvalid={Boolean(quoteState.error)}
        error={quoteState.error?.message}
      >
        <EuiFieldText
          data-test-subj="createDatasetSettingsQuote"
          fullWidth
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
            infoText={createDatasetWizardStrings.settingsEscapeCharacterDescription}
          />
        }
        helpText={createDatasetWizardStrings.settingsEscapeHelp}
        fullWidth
        isInvalid={Boolean(escapeState.error)}
        error={escapeState.error?.message}
      >
        <EuiFieldText
          data-test-subj="createDatasetSettingsEscape"
          fullWidth
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
            infoText={createDatasetWizardStrings.settingsColumnPrefixDescription}
          />
        }
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

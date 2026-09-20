/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldNumber, EuiFieldText, EuiFormRow, EuiSelect } from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useController, useWatch } from 'react-hook-form';

import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';
import {
  DEFAULT_COLUMN_PREFIX,
  DEFAULT_CSV_ESCAPE,
  DEFAULT_CSV_QUOTE,
  validateMaxFieldSize,
  validateEscapeCharacter,
  validateQuoteCharacter,
  validateSchemaSampleSize,
  type CreateDatasetFormValues,
  type DatasetFormatFormValue,
} from '../create_dataset_form_state';

const MULTI_VALUE_SYNTAX_OPTIONS = [
  { value: '', text: createDatasetWizardStrings.settingsMultiValueSyntaxPlaceholder },
  { value: 'none', text: createDatasetWizardStrings.settingsMultiValueSyntaxNone },
  { value: 'brackets', text: createDatasetWizardStrings.settingsMultiValueSyntaxBrackets },
];

const TRIM_SPACES_OPTIONS = [
  { value: 'false', text: createDatasetWizardStrings.falseLabel },
  { value: 'true', text: createDatasetWizardStrings.trueLabel },
];

export function CsvTsvAdvancedSettings({ control }: { control: Control<CreateDatasetFormValues> }) {
  const format: DatasetFormatFormValue = useWatch({ control, name: 'settings.format' });
  const { field: schemaSampleSizeField, fieldState: schemaSampleSizeState } = useController({
    name: 'settings.schema_sample_size',
    control,
    rules: { validate: validateSchemaSampleSize },
  });
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
  const { field: commentField } = useController({ name: 'settings.comment', control });
  const { field: columnPrefixField } = useController({ name: 'settings.column_prefix', control });
  const { field: trimSpacesField } = useController({ name: 'settings.trim_spaces', control });
  const { field: multiValueSyntaxField } = useController({
    name: 'settings.multi_value_syntax',
    control,
  });
  const { field: maxFieldSizeField, fieldState: maxFieldSizeState } = useController({
    name: 'settings.max_field_size',
    control,
    rules: { validate: validateMaxFieldSize },
  });

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
        label={createDatasetWizardStrings.settingsSchemaSampleSizeLabel}
        helpText={createDatasetWizardStrings.settingsSchemaSampleSizeHelp}
        fullWidth
        isInvalid={Boolean(schemaSampleSizeState.error)}
        error={schemaSampleSizeState.error?.message}
      >
        <EuiFieldNumber
          data-test-subj="createDatasetSettingsSchemaSampleSize"
          fullWidth
          min={1}
          step={1}
          isInvalid={Boolean(schemaSampleSizeState.error)}
          value={schemaSampleSizeField.value}
          onChange={(e) => schemaSampleSizeField.onChange(e.target.value)}
          name={schemaSampleSizeField.name}
          inputRef={schemaSampleSizeField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={createDatasetWizardStrings.settingsQuoteLabel}
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
        label={createDatasetWizardStrings.settingsEscapeLabel}
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
        label={createDatasetWizardStrings.settingsCommentLabel}
        helpText={createDatasetWizardStrings.settingsCommentHelp}
        fullWidth
      >
        <EuiFieldText
          data-test-subj="createDatasetSettingsComment"
          fullWidth
          value={commentField.value}
          onChange={(e) => commentField.onChange(e.target.value)}
          name={commentField.name}
          inputRef={commentField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={createDatasetWizardStrings.settingsColumnPrefixLabel}
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
        label={createDatasetWizardStrings.settingsTrimSpacesLabel}
        helpText={createDatasetWizardStrings.settingsTrimSpacesHelp}
        fullWidth
      >
        <EuiSelect
          options={TRIM_SPACES_OPTIONS}
          data-test-subj="createDatasetSettingsTrimSpaces"
          fullWidth
          aria-label={createDatasetWizardStrings.settingsTrimSpacesLabel}
          value={trimSpacesField.value ? 'true' : 'false'}
          onChange={(e) => trimSpacesField.onChange(e.target.value === 'true')}
          name={trimSpacesField.name}
          inputRef={trimSpacesField.ref}
        />
      </EuiFormRow>
      <EuiFormRow label={createDatasetWizardStrings.settingsMultiValueSyntaxLabel} fullWidth>
        <EuiSelect
          options={MULTI_VALUE_SYNTAX_OPTIONS}
          data-test-subj="createDatasetSettingsMultiValueSyntax"
          fullWidth
          aria-label={createDatasetWizardStrings.settingsMultiValueSyntaxLabel}
          value={multiValueSyntaxField.value}
          onChange={(e) => multiValueSyntaxField.onChange(e.target.value)}
          name={multiValueSyntaxField.name}
          inputRef={multiValueSyntaxField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={createDatasetWizardStrings.settingsMaxFieldSizeLabel}
        helpText={createDatasetWizardStrings.settingsMaxFieldSizeHelp}
        fullWidth
        isInvalid={Boolean(maxFieldSizeState.error)}
        error={maxFieldSizeState.error?.message}
      >
        <EuiFieldNumber
          data-test-subj="createDatasetSettingsMaxFieldSize"
          fullWidth
          min={0}
          step={1}
          isInvalid={Boolean(maxFieldSizeState.error)}
          value={maxFieldSizeField.value}
          onChange={(e) => maxFieldSizeField.onChange(e.target.value)}
          name={maxFieldSizeField.name}
          inputRef={maxFieldSizeField.ref}
        />
      </EuiFormRow>
    </div>
  );
}

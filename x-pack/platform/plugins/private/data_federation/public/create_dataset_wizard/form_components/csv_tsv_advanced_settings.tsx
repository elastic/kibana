/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldNumber, EuiFieldText, EuiFormRow, EuiSelect } from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useController } from 'react-hook-form';

import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';
import {
  validateMaxFieldSize,
  validateSchemaSampleSize,
  type CreateDatasetFormValues,
} from '../create_dataset_form_state';

const MULTI_VALUE_SYNTAX_OPTIONS = [
  { value: '', text: createDatasetWizardStrings.settingsMultiValueSyntaxPlaceholder },
  { value: 'none', text: createDatasetWizardStrings.settingsMultiValueSyntaxNone },
  { value: 'brackets', text: createDatasetWizardStrings.settingsMultiValueSyntaxBrackets },
];

export function CsvTsvAdvancedSettings({ control }: { control: Control<CreateDatasetFormValues> }) {
  const { field: schemaSampleSizeField, fieldState: schemaSampleSizeState } = useController({
    name: 'settings.schema_sample_size',
    control,
    rules: { validate: validateSchemaSampleSize },
  });
  const { field: quoteField } = useController({ name: 'settings.quote', control });
  const { field: escapeField } = useController({ name: 'settings.escape', control });
  const { field: commentField } = useController({ name: 'settings.comment', control });
  const { field: columnPrefixField } = useController({ name: 'settings.column_prefix', control });
  const { field: multiValueSyntaxField } = useController({
    name: 'settings.multi_value_syntax',
    control,
  });
  const { field: maxFieldSizeField, fieldState: maxFieldSizeState } = useController({
    name: 'settings.max_field_size',
    control,
    rules: { validate: validateMaxFieldSize },
  });

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
      >
        <EuiFieldText
          data-test-subj="createDatasetSettingsQuote"
          fullWidth
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
      >
        <EuiFieldText
          data-test-subj="createDatasetSettingsEscape"
          fullWidth
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

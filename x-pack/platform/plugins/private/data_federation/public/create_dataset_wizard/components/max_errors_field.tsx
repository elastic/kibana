/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiCode, EuiFieldNumber, EuiFormRow, EuiText } from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useController } from 'react-hook-form';

import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';
import { validateMaxErrors, type CreateDatasetFormValues } from '../create_dataset_form_state';
import { FormRowLabelWithInfo } from './form_row_label_with_info';

const helpTextDefault = (valueLabel: string) => (
  <EuiText size="xs" color="subdued">
    <EuiCode>{valueLabel}</EuiCode> {createDatasetWizardStrings.byDefaultSuffix}
  </EuiText>
);

export function MaxErrorsField({ control }: { control: Control<CreateDatasetFormValues> }) {
  const { field: maxErrorsField, fieldState: maxErrorsState } = useController({
    name: 'settings.max_errors',
    control,
    rules: { validate: validateMaxErrors },
  });
  const maxErrorsInlineError = useMemo(() => {
    const result = validateMaxErrors(maxErrorsField.value);
    return result === true ? undefined : result;
  }, [maxErrorsField.value]);
  const maxErrorsErrorMessage = maxErrorsState.error?.message ?? maxErrorsInlineError;
  const isMaxErrorsInvalid = Boolean(maxErrorsErrorMessage);

  return (
    <EuiFormRow
      label={
        <FormRowLabelWithInfo
          label={createDatasetWizardStrings.settingsMaxErrorsLabel}
          infoText={createDatasetWizardStrings.settingsMaxErrorsDescription}
        />
      }
      helpText={helpTextDefault(createDatasetWizardStrings.unbounded)}
      fullWidth
      isInvalid={isMaxErrorsInvalid}
      error={maxErrorsErrorMessage}
    >
      <EuiFieldNumber
        data-test-subj="createDatasetSettingsMaxErrors"
        fullWidth
        min={1}
        step={1}
        placeholder={createDatasetWizardStrings.settingsMaxErrorsPlaceholder}
        isInvalid={isMaxErrorsInvalid}
        value={maxErrorsField.value}
        onChange={(e) => maxErrorsField.onChange(e.target.value)}
        name={maxErrorsField.name}
        inputRef={maxErrorsField.ref}
      />
    </EuiFormRow>
  );
}

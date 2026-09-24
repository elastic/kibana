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
import { validateMaxErrorRatio, type CreateDatasetFormValues } from '../create_dataset_form_state';
import { FormRowLabelWithInfo } from './form_row_label_with_info';

const helpTextDefault = (valueLabel: string) => (
  <EuiText size="xs" color="subdued">
    <EuiCode>{valueLabel}</EuiCode> {createDatasetWizardStrings.byDefaultSuffix}
  </EuiText>
);

export function MaxErrorRatioField({ control }: { control: Control<CreateDatasetFormValues> }) {
  const { field: maxErrorRatioField, fieldState: maxErrorRatioState } = useController({
    name: 'settings.max_error_ratio',
    control,
    rules: { validate: validateMaxErrorRatio },
  });

  const maxErrorRatioInlineError = useMemo(() => {
    // Show an error beneath the input immediately when out of range,
    // even if the form is not currently validating onChange.
    const value = maxErrorRatioField.value;
    if (!value?.trim()) return undefined;
    const parsed = Number(value);
    if (isNaN(parsed) || parsed < 0 || parsed > 1) {
      return createDatasetWizardStrings.settingsMaxErrorRatioInvalid;
    }
    return undefined;
  }, [maxErrorRatioField.value]);

  const maxErrorRatioErrorMessage = maxErrorRatioState.error?.message ?? maxErrorRatioInlineError;
  const isMaxErrorRatioInvalid = Boolean(maxErrorRatioErrorMessage);

  return (
    <EuiFormRow
      label={
        <FormRowLabelWithInfo
          label={createDatasetWizardStrings.settingsMaxErrorRatioLabel}
          infoText={createDatasetWizardStrings.settingsMaxErrorRatioDescription}
        />
      }
      helpText={helpTextDefault('0.0')}
      fullWidth
      isInvalid={isMaxErrorRatioInvalid}
      error={maxErrorRatioErrorMessage}
    >
      <EuiFieldNumber
        data-test-subj="createDatasetSettingsMaxErrorRatio"
        fullWidth
        min={0}
        max={1}
        step={0.01}
        placeholder={createDatasetWizardStrings.settingsMaxErrorRatioPlaceholder}
        isInvalid={isMaxErrorRatioInvalid}
        value={maxErrorRatioField.value}
        onChange={(e) => maxErrorRatioField.onChange(e.target.value)}
        name={maxErrorRatioField.name}
        inputRef={maxErrorRatioField.ref}
      />
    </EuiFormRow>
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode, EuiFormRow } from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useFormContext } from 'react-hook-form';
import { FormattedMessage } from '@kbn/i18n-react';

import { createDatasetWizardStrings } from '../../../create_dataset_wizard_i18n';
import {
  DEFAULT_ERROR_MODE,
  errorModeAllowsBudget,
  type CreateDatasetFormValues,
  type DatasetErrorModeFormValue,
} from '../../../create_dataset_form_state';
import { FormRowLabelWithInfo } from '../../../components/form_row_label_with_info';
import {
  useComboBoxSelectionValidity,
  type ComboBoxChange,
} from '../../../components/combo_box_selection_validity';
import { ErrorModeSelect } from './error_mode_select';
import { MaxErrorRatioField } from './max_error_ratio_field';
import { MaxErrorsField } from './max_errors_field';

export function ErrorConfig({ control }: { control: Control<CreateDatasetFormValues> }) {
  const { setValue } = useFormContext<CreateDatasetFormValues>();
  const {
    field: errorModeField,
    fieldState: errorModeState,
    onChange: setErrorMode,
  } = useComboBoxSelectionValidity({ name: 'settings.error_mode', flag: 'errorModeIsValid' });

  const allowsBudget = errorModeAllowsBudget(errorModeField.value);

  const onErrorModeChange = (change: ComboBoxChange<DatasetErrorModeFormValue>) => {
    setErrorMode(change);
    if (errorModeAllowsBudget(change.value)) return;
    setValue('settings.max_errors', '');
    setValue('settings.max_error_ratio', '');
  };

  return (
    <>
      <EuiFormRow
        label={
          <FormRowLabelWithInfo
            label={createDatasetWizardStrings.settingsErrorModeLabel}
            infoText={createDatasetWizardStrings.settingsErrorModeDescription}
          />
        }
        helpText={
          <FormattedMessage
            id="xpack.dataFederation.createDatasetForm.settingsErrorModeHelpText"
            defaultMessage="{defaultValue} by default"
            values={{ defaultValue: <EuiCode>{DEFAULT_ERROR_MODE}</EuiCode> }}
          />
        }
        fullWidth
        isInvalid={Boolean(errorModeState.error)}
        error={errorModeState.error?.message}
      >
        <ErrorModeSelect
          value={errorModeField.value}
          onChange={onErrorModeChange}
          onBlur={errorModeField.onBlur}
          isInvalid={Boolean(errorModeState.error)}
        />
      </EuiFormRow>

      {allowsBudget ? (
        <>
          <MaxErrorsField control={control} />
          <MaxErrorRatioField control={control} />
        </>
      ) : null}
    </>
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiCode, EuiFieldNumber, EuiFormRow } from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useController } from 'react-hook-form';
import { FormattedMessage } from '@kbn/i18n-react';

import { createDatasetWizardStrings } from '../../../create_dataset_wizard_i18n';
import { validateSkipRows, type CreateDatasetFormValues } from '../../../create_dataset_form_state';
import { FormRowLabelWithInfo } from '../../../components/form_row_label_with_info';

export function SkipRowsField({ control }: { control: Control<CreateDatasetFormValues> }) {
  const { field: skipRowsField, fieldState: skipRowsState } = useController({
    name: 'settings.skip_rows',
    control,
    rules: { validate: validateSkipRows },
  });

  const skipRowsInlineError = useMemo(() => {
    const result = validateSkipRows(skipRowsField.value);
    return result === true ? undefined : result;
  }, [skipRowsField.value]);

  const skipRowsErrorMessage = skipRowsState.error?.message ?? skipRowsInlineError;
  const isSkipRowsInvalid = Boolean(skipRowsErrorMessage);

  return (
    <EuiFormRow
      label={
        <FormRowLabelWithInfo
          label={createDatasetWizardStrings.settingsSkipRowsLabel}
          infoText={createDatasetWizardStrings.settingsSkipRowsDescription}
        />
      }
      helpText={
        <FormattedMessage
          id="xpack.dataFederation.createDatasetForm.settingsSkipRowsHelp"
          defaultMessage="{zeroValue} by default"
          values={{ zeroValue: <EuiCode>0</EuiCode> }}
        />
      }
      fullWidth
      isInvalid={isSkipRowsInvalid}
      error={skipRowsErrorMessage}
    >
      <EuiFieldNumber
        data-test-subj="createDatasetSettingsSkipRows"
        fullWidth
        min={0}
        max={1000}
        step={1}
        placeholder={createDatasetWizardStrings.settingsSkipRowsPlaceholder}
        isInvalid={isSkipRowsInvalid}
        value={skipRowsField.value}
        onChange={(e) => skipRowsField.onChange(e.target.value)}
        name={skipRowsField.name}
        inputRef={skipRowsField.ref}
      />
    </EuiFormRow>
  );
}

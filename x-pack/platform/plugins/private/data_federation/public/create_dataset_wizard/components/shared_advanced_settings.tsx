/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode, EuiFieldNumber, EuiFieldText, EuiFormRow, EuiText } from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useController } from 'react-hook-form';

import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';
import {
  DEFAULT_FILE_EXCLUSIONS,
  validateMaxErrors,
  type CreateDatasetFormValues,
} from '../create_dataset_form_state';
import { ErrorModeSelect } from './error_mode_select';
import { FormRowLabelWithInfo } from './form_row_label_with_info';
import { FileExclusionsSelect } from './file_exclusions_select';
import { MaxErrorRatioField } from './max_error_ratio_field';
import { PartitionDetectionSelect } from './partition_detection_select';

const helpTextDefault = (valueLabel: string) => (
  <EuiText size="xs" color="subdued">
    <EuiCode>{valueLabel}</EuiCode> {createDatasetWizardStrings.byDefaultSuffix}
  </EuiText>
);

const fileExclusionsDefaultValueLabel = `[${DEFAULT_FILE_EXCLUSIONS.map((pattern) =>
  JSON.stringify(pattern)
).join(', ')}]`;
const fileExclusionsDefaultHelp = helpTextDefault(fileExclusionsDefaultValueLabel);

export function SharedAdvancedSettings({ control }: { control: Control<CreateDatasetFormValues> }) {
  const { field: partitionPathField } = useController({
    name: 'settings.partition_path',
    control,
  });
  const { field: errorModeField } = useController({ name: 'settings.error_mode', control });
  const { field: maxErrorsField, fieldState: maxErrorsState } = useController({
    name: 'settings.max_errors',
    control,
    rules: { validate: validateMaxErrors },
  });

  return (
    <div data-test-subj="createDatasetSharedAdvancedSettings">
      <EuiFormRow
        label={
          <FormRowLabelWithInfo
            label={createDatasetWizardStrings.settingsFileExclusionsLabel}
            infoText={createDatasetWizardStrings.settingsFileExclusionsDescription}
          />
        }
        helpText={fileExclusionsDefaultHelp}
        fullWidth
      >
        <FileExclusionsSelect control={control} />
      </EuiFormRow>

      <EuiFormRow
        label={
          <FormRowLabelWithInfo
            label={createDatasetWizardStrings.settingsPartitionDetectionLabel}
            infoText={createDatasetWizardStrings.settingsPartitionDetectionDescription}
          />
        }
        fullWidth
      >
        <PartitionDetectionSelect control={control} />
      </EuiFormRow>

      <EuiFormRow
        label={
          <FormRowLabelWithInfo
            label={createDatasetWizardStrings.settingsPartitionPathLabel}
            infoText={createDatasetWizardStrings.settingsPartitionPathDescription}
          />
        }
        helpText={createDatasetWizardStrings.settingsPartitionPathHelp}
        fullWidth
      >
        <EuiFieldText
          data-test-subj="createDatasetSettingsPartitionPath"
          fullWidth
          value={partitionPathField.value}
          onChange={(e) => partitionPathField.onChange(e.target.value)}
          name={partitionPathField.name}
          inputRef={partitionPathField.ref}
        />
      </EuiFormRow>

      <EuiFormRow
        label={
          <FormRowLabelWithInfo
            label={createDatasetWizardStrings.settingsErrorModeLabel}
            infoText={createDatasetWizardStrings.settingsErrorModeDescription}
          />
        }
        helpText={helpTextDefault('fail_fast')}
        fullWidth
      >
        <ErrorModeSelect
          value={errorModeField.value}
          onChange={errorModeField.onChange}
          onBlur={errorModeField.onBlur}
        />
      </EuiFormRow>

      <EuiFormRow
        label={
          <FormRowLabelWithInfo
            label={createDatasetWizardStrings.settingsMaxErrorsLabel}
            infoText={createDatasetWizardStrings.settingsMaxErrorsDescription}
          />
        }
        helpText={helpTextDefault(createDatasetWizardStrings.unbounded)}
        fullWidth
        isInvalid={Boolean(maxErrorsState.error)}
        error={maxErrorsState.error?.message}
      >
        <EuiFieldNumber
          data-test-subj="createDatasetSettingsMaxErrors"
          fullWidth
          min={0}
          step={1}
          placeholder={createDatasetWizardStrings.settingsMaxErrorsPlaceholder}
          isInvalid={Boolean(maxErrorsState.error)}
          value={maxErrorsField.value}
          onChange={(e) => maxErrorsField.onChange(e.target.value)}
          name={maxErrorsField.name}
          inputRef={maxErrorsField.ref}
        />
      </EuiFormRow>

      <MaxErrorRatioField control={control} />
    </div>
  );
}

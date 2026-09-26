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
  DEFAULT_FILE_EXCLUSIONS,
  validatePartitionPath,
  type CreateDatasetFormValues,
} from '../create_dataset_form_state';
import { ErrorModeSelect } from './error_mode_select';
import { FormRowLabelWithInfo } from './form_row_label_with_info';
import { FileExclusionsSelect } from './file_exclusions_select';
import { MaxErrorRatioField } from './max_error_ratio_field';
import { MaxErrorsField } from './max_errors_field';
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
  const partitionDetection = useWatch({ control, name: 'settings.partition_detection' });
  const { field: partitionPathField, fieldState: partitionPathState } = useController({
    name: 'settings.partition_path',
    control,
    rules: { validate: validatePartitionPath },
  });
  const { field: errorModeField } = useController({ name: 'settings.error_mode', control });

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

      {partitionDetection === 'template' ? (
        <EuiFormRow
          label={
            <FormRowLabelWithInfo
              label={createDatasetWizardStrings.settingsPartitionPathLabel}
              infoText={createDatasetWizardStrings.settingsPartitionPathDescription}
            />
          }
          helpText={createDatasetWizardStrings.settingsPartitionPathHelp}
          fullWidth
          isInvalid={Boolean(partitionPathState.error)}
          error={partitionPathState.error?.message}
        >
          <EuiFieldText
            data-test-subj="createDatasetSettingsPartitionPath"
            fullWidth
            isInvalid={Boolean(partitionPathState.error)}
            value={partitionPathField.value}
            onChange={(e) => partitionPathField.onChange(e.target.value)}
            name={partitionPathField.name}
            inputRef={partitionPathField.ref}
          />
        </EuiFormRow>
      ) : null}

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

      <MaxErrorsField control={control} />

      <MaxErrorRatioField control={control} />
    </div>
  );
}

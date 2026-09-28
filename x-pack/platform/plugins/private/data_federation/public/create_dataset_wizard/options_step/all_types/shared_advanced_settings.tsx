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
import { FormattedMessage } from '@kbn/i18n-react';

import { createDatasetWizardStrings } from '../../create_dataset_wizard_i18n';
import {
  validatePartitionPath,
  type CreateDatasetFormValues,
} from '../../create_dataset_form_state';
import { ErrorModeSelect } from './fields/error_mode_select';
import { FormRowLabelWithInfo } from '../../components/form_row_label_with_info';
import { FileExclusionsSelect } from './fields/file_exclusions_select';
import { MaxErrorRatioField } from './fields/max_error_ratio_field';
import { MaxErrorsField } from './fields/max_errors_field';
import { PartitionDetectionSelect } from '../../components/fields/partition_detection_select';
const fileExclusionsDefaultHelp = (
  <FormattedMessage
    id="xpack.dataFederation.createDatasetForm.settingsFileExclusionsHelpText"
    defaultMessage="Files matching these patterns are excluded."
  />
);

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
        label={createDatasetWizardStrings.settingsPartitionDetectionLabel}
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
            placeholder={createDatasetWizardStrings.settingsPartitionPathPlaceholder}
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
        helpText={
          <FormattedMessage
            id="xpack.dataFederation.createDatasetForm.settingsErrorModeHelpText"
            defaultMessage="Defaults to {failFast} when no option is selected."
            values={{
              failFast: <strong>{createDatasetWizardStrings.settingsErrorModeFailFast}</strong>,
            }}
          />
        }
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode, EuiFieldText, EuiFormRow } from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useController } from 'react-hook-form';
import { FormattedMessage } from '@kbn/i18n-react';

import { createDatasetWizardStrings } from '../../create_dataset_wizard_i18n';
import {
  DEFAULT_FILE_EXCLUSIONS,
  DEFAULT_PARTITION_DETECTION,
  validatePartitionPath,
  type CreateDatasetFormValues,
} from '../../create_dataset_form_state';
import { ErrorConfig } from './fields/error_config';
import { FormRowLabelWithInfo } from '../../components/form_row_label_with_info';
import { FileExclusionsSelect } from './fields/file_exclusions_select';
import { PartitionDetectionSelect } from '../../components/fields/partition_detection_select';
import { useComboBoxSelectionValidity } from '../../components/combo_box_selection_validity';

const DEFAULT_FILE_EXCLUSIONS_DISPLAY = `[${DEFAULT_FILE_EXCLUSIONS.map(
  (pattern) => `"${pattern}"`
).join(', ')}]`;

export function SharedAdvancedSettings({ control }: { control: Control<CreateDatasetFormValues> }) {
  const {
    field: partitionDetectionField,
    fieldState: partitionDetectionState,
    onChange: onPartitionDetectionChange,
  } = useComboBoxSelectionValidity({
    name: 'settings.partition_detection',
    flag: 'partitionDetectionIsValid',
  });

  const { field: partitionPathField, fieldState: partitionPathState } = useController({
    name: 'settings.partition_path',
    control,
    rules: { validate: validatePartitionPath },
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
        helpText={
          <FormattedMessage
            id="xpack.dataFederation.createDatasetForm.settingsFileExclusionsHelpText"
            defaultMessage="{defaultValue} by default"
            values={{ defaultValue: <EuiCode>{DEFAULT_FILE_EXCLUSIONS_DISPLAY}</EuiCode> }}
          />
        }
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
        helpText={
          <FormattedMessage
            id="xpack.dataFederation.createDatasetForm.settingsPartitionDetectionHelp"
            defaultMessage="{defaultValue} by default"
            values={{ defaultValue: <EuiCode>{DEFAULT_PARTITION_DETECTION}</EuiCode> }}
          />
        }
        fullWidth
        isInvalid={Boolean(partitionDetectionState.error)}
        error={partitionDetectionState.error?.message}
      >
        <PartitionDetectionSelect
          value={partitionDetectionField.value}
          onChange={onPartitionDetectionChange}
          onBlur={partitionDetectionField.onBlur}
          isInvalid={Boolean(partitionDetectionState.error)}
        />
      </EuiFormRow>

      {partitionDetectionField.value === 'template' ? (
        <EuiFormRow
          label={
            <FormRowLabelWithInfo
              label={createDatasetWizardStrings.settingsPartitionPathLabel}
              infoText={createDatasetWizardStrings.settingsPartitionPathDescription}
            />
          }
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

      <ErrorConfig control={control} />
    </div>
  );
}

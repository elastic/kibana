/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { EuiCode, EuiFieldNumber, EuiFieldText, EuiFormRow, EuiText } from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useController } from 'react-hook-form';

import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';
import {
  DEFAULT_FILE_EXCLUSIONS,
  validateMaxErrorRatio,
  validateMaxErrors,
  type CreateDatasetFormValues,
} from '../create_dataset_form_state';
import { ErrorModeSelect } from './error_mode_select';
import { FileExclusionsSelect } from './file_exclusions_select';
import { PartitionDetectionSelect } from './partition_detection_select';

const helpTextDefault = (valueLabel: string) => (
  <EuiText size="xs" color="subdued">
    <EuiCode>{valueLabel}</EuiCode> {createDatasetWizardStrings.byDefaultSuffix}
  </EuiText>
);

const fileExclusionsDefaultHelp = (
  <EuiText size="xs" color="subdued">
    {createDatasetWizardStrings.settingsFileExclusionsHelp}{' '}
    {DEFAULT_FILE_EXCLUSIONS.map((pattern, index) => (
      <Fragment key={pattern}>
        {index > 0 ? ', ' : null}
        <EuiCode>{pattern}</EuiCode>
      </Fragment>
    ))}{' '}
    {createDatasetWizardStrings.byDefaultSuffix}
  </EuiText>
);

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
  const { field: maxErrorRatioField, fieldState: maxErrorRatioState } = useController({
    name: 'settings.max_error_ratio',
    control,
    rules: { validate: validateMaxErrorRatio },
  });

  return (
    <div data-test-subj="createDatasetSharedAdvancedSettings">
      <EuiFormRow
        label={createDatasetWizardStrings.settingsFileExclusionsLabel}
        helpText={fileExclusionsDefaultHelp}
        fullWidth
      >
        <FileExclusionsSelect control={control} />
      </EuiFormRow>

      <EuiFormRow label={createDatasetWizardStrings.settingsPartitionDetectionLabel} fullWidth>
        <PartitionDetectionSelect control={control} />
      </EuiFormRow>

      <EuiFormRow
        label={createDatasetWizardStrings.settingsPartitionPathLabel}
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
        label={createDatasetWizardStrings.settingsErrorModeLabel}
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
        label={createDatasetWizardStrings.settingsMaxErrorsLabel}
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

      <EuiFormRow
        label={createDatasetWizardStrings.settingsMaxErrorRatioLabel}
        helpText={helpTextDefault('0.0')}
        fullWidth
        isInvalid={Boolean(maxErrorRatioState.error)}
        error={maxErrorRatioState.error?.message}
      >
        <EuiFieldNumber
          data-test-subj="createDatasetSettingsMaxErrorRatio"
          fullWidth
          min={0}
          max={1}
          step={0.01}
          placeholder={createDatasetWizardStrings.settingsMaxErrorRatioPlaceholder}
          isInvalid={Boolean(maxErrorRatioState.error)}
          value={maxErrorRatioField.value}
          onChange={(e) => maxErrorRatioField.onChange(e.target.value)}
          name={maxErrorRatioField.name}
          inputRef={maxErrorRatioField.ref}
        />
      </EuiFormRow>
    </div>
  );
}

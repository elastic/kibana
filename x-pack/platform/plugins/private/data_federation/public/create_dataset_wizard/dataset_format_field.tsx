/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import type { EuiSuperSelectProps } from '@elastic/eui';
import { EuiFormRow, EuiSuperSelect } from '@elastic/eui';
import type { ControllerFieldState, ControllerRenderProps } from 'react-hook-form';

import { createDatasetFlyoutStrings } from '../create_dataset_flyout/create_dataset_flyout_i18n';
import type { DatasetFormatFormValue } from '../create_dataset_flyout/create_dataset_flyout_form_state';
import type { DatasetWizardFormValues } from './dataset_wizard_form_state';

export interface DatasetFormatFieldProps {
  formatField: ControllerRenderProps<DatasetWizardFormValues, 'settings.format'>;
  formatFieldState: ControllerFieldState;
  format: DatasetFormatFormValue;
  hasFormatSelected: boolean;
  formatSuperSelectOptions: EuiSuperSelectProps['options'];
  onFormatChange: (nextFormat: Exclude<DatasetFormatFormValue, ''>) => void;
}

export const DatasetFormatField: FunctionComponent<DatasetFormatFieldProps> = ({
  formatField,
  formatFieldState,
  format,
  hasFormatSelected,
  formatSuperSelectOptions,
  onFormatChange,
}) => (
  <EuiFormRow
    label={createDatasetFlyoutStrings.settingsFormatLabel()}
    fullWidth
    isInvalid={Boolean(formatFieldState.error)}
    error={formatFieldState.error?.message}
  >
    <EuiSuperSelect
      options={formatSuperSelectOptions}
      data-test-subj="datasetWizardSettingsFormat"
      fullWidth
      aria-label={createDatasetFlyoutStrings.settingsFormatLabel()}
      placeholder={createDatasetFlyoutStrings.settingsFormatPlaceholder()}
      valueOfSelected={hasFormatSelected ? format : undefined}
      onChange={(nextFormat) => {
        onFormatChange(nextFormat);
      }}
      name={formatField.name}
      buttonRef={formatField.ref}
      isInvalid={Boolean(formatFieldState.error)}
    />
  </EuiFormRow>
);

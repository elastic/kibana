/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { EuiFormRow, EuiSwitch } from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useController } from 'react-hook-form';

import type { DatasetWizardFormValues } from './dataset_wizard_form_state';
import { datasetWizardStrings } from './dataset_wizard_i18n';

export interface DynamicFieldsSettingProps {
  control: Control<DatasetWizardFormValues>;
}

/** Whether the fields a user leaves unmapped are still inferred at query time. */
export const DynamicFieldsSetting: FunctionComponent<DynamicFieldsSettingProps> = ({ control }) => {
  const { field } = useController({ control, name: 'dynamic_fields_enabled' });
  const isEnabled = field.value !== false;

  return (
    <EuiFormRow
      fullWidth
      // Says what the setting does now, rather than what turning it off would do.
      helpText={
        isEnabled
          ? datasetWizardStrings.dynamicFieldsEnabledHelp()
          : datasetWizardStrings.dynamicFieldsDisabled()
      }
      data-test-subj="datasetWizardDynamicFieldsSetting"
    >
      <EuiSwitch
        compressed
        label={datasetWizardStrings.dynamicFieldsTitle()}
        checked={isEnabled}
        onChange={(event) => field.onChange(event.target.checked)}
        data-test-subj="datasetWizardDynamicFieldsEnabled"
      />
    </EuiFormRow>
  );
};

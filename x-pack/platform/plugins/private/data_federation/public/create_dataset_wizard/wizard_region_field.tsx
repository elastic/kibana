/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { EuiFormRow } from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useController } from 'react-hook-form';

import { datasetWizardStrings } from './dataset_wizard_i18n';
import type { DatasetWizardFormValues } from './dataset_wizard_form_state';
import { RegionSuperSelect } from './region_super_select';

export interface WizardRegionFieldProps {
  control: Control<DatasetWizardFormValues>;
  autoDetectedRegion?: string;
  onRegionManualChange?: (regionId: string) => void;
}

export const WizardRegionField: FunctionComponent<WizardRegionFieldProps> = ({
  control,
  autoDetectedRegion = '',
  onRegionManualChange,
}) => {
  const { field: regionField, fieldState: regionFieldState } = useController({
    name: 'region',
    control,
    rules: {
      validate: (value: string): true | string =>
        value?.trim() ? true : datasetWizardStrings.regionRequired(),
    },
  });

  return (
    <EuiFormRow
      label={datasetWizardStrings.regionLabel()}
      fullWidth
      isInvalid={Boolean(regionFieldState.error)}
      error={regionFieldState.error?.message}
    >
      <RegionSuperSelect
        data-test-subj="datasetWizardRegion"
        fullWidth
        aria-label={datasetWizardStrings.regionLabel()}
        placeholder={datasetWizardStrings.regionPlaceholder()}
        searchPlaceholder={datasetWizardStrings.regionSearchPlaceholder()}
        isInvalid={Boolean(regionFieldState.error)}
        value={regionField.value || undefined}
        autoDetectedRegion={autoDetectedRegion}
        onChange={(nextRegion) => {
          onRegionManualChange?.(nextRegion);
          regionField.onChange(nextRegion);
        }}
        onBlur={regionField.onBlur}
        name={regionField.name}
        buttonRef={regionField.ref}
      />
    </EuiFormRow>
  );
};

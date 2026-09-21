/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode, EuiFormRow, EuiSpacer, EuiText } from '@elastic/eui';
import type { Control } from 'react-hook-form';

import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';
import type { CreateDatasetFormValues } from '../create_dataset_form_state';
import { LateMaterializationSelect } from './late_materialization_select';
import { OptimizedReaderSelect } from './optimized_reader_select';

const helpTextDefault = (valueLabel: string) => (
  <EuiText size="xs" color="subdued">
    <EuiCode>{valueLabel}</EuiCode> {createDatasetWizardStrings.byDefaultSuffix}
  </EuiText>
);

export function ParquetAdvancedSettings({
  control,
}: {
  control: Control<CreateDatasetFormValues>;
}) {
  return (
    <div data-test-subj="createDatasetParquetAdvancedSettings">
      <EuiSpacer size="m" />
      <EuiFormRow
        label={createDatasetWizardStrings.settingsOptimizedReaderLabel}
        helpText={helpTextDefault('true')}
        fullWidth
      >
        <OptimizedReaderSelect control={control} />
      </EuiFormRow>

      <EuiFormRow
        label={createDatasetWizardStrings.settingsLateMaterializationLabel}
        helpText={helpTextDefault('true')}
        fullWidth
      >
        <LateMaterializationSelect control={control} />
      </EuiFormRow>
    </div>
  );
}

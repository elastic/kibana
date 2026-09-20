/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import { useFormContext } from 'react-hook-form';

import type { CreateDatasetFormValues } from './create_dataset_form_state';
import { CreateDatasetAdditionalSettings } from './create_dataset_settings';
import { createDatasetWizardStrings } from './create_dataset_wizard_i18n';

export function StepAdditional() {
  const { control } = useFormContext<CreateDatasetFormValues>();

  return (
    <div data-test-subj="createDatasetWizardAdditionalStep">
      <EuiTitle size="m">
        <h3>{createDatasetWizardStrings.additionalStepLabel}</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <CreateDatasetAdditionalSettings control={control} />
    </div>
  );
}

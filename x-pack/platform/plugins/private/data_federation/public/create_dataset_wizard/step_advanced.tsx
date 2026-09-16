/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useFormContext } from 'react-hook-form';

import type { CreateDatasetFormValues } from '../create_dataset_flyout/create_dataset_flyout_form_state';
import { CreateDatasetFlyoutSettings } from '../create_dataset_flyout/create_dataset_flyout_settings';

export function StepAdvanced() {
  const { control } = useFormContext<CreateDatasetFormValues>();

  return (
    <div data-test-subj="createDatasetWizardAdvancedStep">
      <CreateDatasetFlyoutSettings control={control} />
    </div>
  );
}

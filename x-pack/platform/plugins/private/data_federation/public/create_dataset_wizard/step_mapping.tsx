/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiTitle } from '@elastic/eui';

import { createDatasetWizardStrings } from './create_dataset_wizard_i18n';

export function StepMapping() {
  return (
    <div data-test-subj="createDatasetWizardMappingStep">
      <EuiTitle size="m">
        <h2>{createDatasetWizardStrings.mappingStepLabel}</h2>
      </EuiTitle>
      <EuiSpacer size="m" />
    </div>
  );
}

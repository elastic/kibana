/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiTitle } from '@elastic/eui';

import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';
import { DatasetPreview } from './dataset_preview';

export function StepPreview() {
  return (
    <div data-test-subj="createDatasetWizardPreviewStep">
      <EuiTitle size="m">
        <h2>{createDatasetWizardStrings.previewStepLabel}</h2>
      </EuiTitle>
      <EuiSpacer size="l" />
      <DatasetPreview />
    </div>
  );
}

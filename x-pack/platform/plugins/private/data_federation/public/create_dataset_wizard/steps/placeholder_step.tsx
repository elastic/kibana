/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';

import { datasetWizardStrings } from '../dataset_wizard_i18n';

export interface PlaceholderStepProps {
  stepTitle: string;
}

export const PlaceholderStep: FunctionComponent<PlaceholderStepProps> = ({ stepTitle }) => (
  <>
    <EuiTitle size="s">
      <h3>{stepTitle}</h3>
    </EuiTitle>
    <EuiSpacer size="m" />
    <EuiText color="subdued" data-test-subj="datasetWizardPlaceholderStep">
      <p>{datasetWizardStrings.placeholderStepDescription(stepTitle)}</p>
    </EuiText>
  </>
);

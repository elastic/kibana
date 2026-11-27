/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { SetupWizardStepLayout } from '../setup_wizard_step_layout';
import type { SetupWizardStepContentProps } from '../types';

const placeholderText = i18n.translate('xpack.contextEngine.setupWizard.placeholder', {
  defaultMessage: 'This step is not ready yet. Skip it for now.',
});

/** Body of a step whose content is not built yet. */
export const PlaceholderStepContent = ({ layout }: SetupWizardStepContentProps) => (
  <SetupWizardStepLayout {...layout}>
    <EuiText size="s" data-test-subj="contextSetupWizardPlaceholder">
      <p>{placeholderText}</p>
    </EuiText>
  </SetupWizardStepLayout>
);

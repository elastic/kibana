/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ReasoningStep as ReasoningStepData } from '@kbn/agent-builder-common/chat/conversation';
import { StepLayout } from '../step_layout';

const ariaLabel = i18n.translate('xpack.agentBuilder.roundEvents.steps.reasoning.ariaLabel', {
  defaultMessage: 'Agent reasoning',
});

interface ReasoningStepProps {
  step: ReasoningStepData;
}

/**
 * Renders a `ReasoningStep` as a static row containing the reasoning text in
 * full (no truncation, no expansion). Not clickable — reasoning has no
 * sub-fields.
 *
 * Note: transient reasoning steps are filtered out by `StepItem` before
 * reaching this component.
 */
export const ReasoningStep: React.FC<ReasoningStepProps> = ({ step }) => (
  <StepLayout
    label={
      <EuiText color="inherit">
        <p role="status" aria-label={ariaLabel}>
          {step.reasoning}
        </p>
      </EuiText>
    }
  />
);

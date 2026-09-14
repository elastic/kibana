/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SubstitutionStep as SubstitutionStepData } from '@kbn/agent-builder-common';
import { StepLayout } from '../step_layout';

interface SubstitutionStepProps {
  step: SubstitutionStepData;
}

export const SubstitutionStep: React.FC<SubstitutionStepProps> = ({ step }) => {
  return (
    <StepLayout
      label={
        <EuiText color="inherit">
          <p role="status">
            <FormattedMessage
              id="xpack.agentBuilder.roundEvents.steps.substitution.applied"
              defaultMessage="Moved {count, plural, one {# tool result} other {# tool results}} to the filesystem to free context"
              values={{ count: step.substituted_tool_call_ids.length }}
            />
          </p>
        </EuiText>
      }
    />
  );
};

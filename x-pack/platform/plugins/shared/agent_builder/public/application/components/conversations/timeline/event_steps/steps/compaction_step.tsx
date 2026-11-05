/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ShimmeringText } from '@kbn/custom-content-renderer';
import type { CompactionStep as CompactionStepData } from '@kbn/agent-builder-common';
import { StepLayout } from '../step_layout';
import { useChatStatusShimmer } from '../../use_chat_status_shimmer';

const compactingLabel = i18n.translate(
  'xpack.agentBuilder.eventSteps.steps.compaction.inProgress',
  {
    defaultMessage: 'Compacting context',
  }
);

interface CompactionStepProps {
  step: CompactionStepData;
}

export const CompactionStep: React.FC<CompactionStepProps> = ({ step }) => {
  const chatShimmer = useChatStatusShimmer();
  const isInProgress = step.token_count_after === 0;

  return (
    <StepLayout
      label={
        <EuiText color="inherit">
          <p role="status" aria-live="polite">
            {isInProgress ? (
              <ShimmeringText text={compactingLabel} enabled={chatShimmer} />
            ) : (
              <FormattedMessage
                id="xpack.agentBuilder.eventSteps.steps.compaction.completeTokens"
                defaultMessage="Context condensed: {before} → {after} tokens"
                values={{
                  before: step.token_count_before.toLocaleString(),
                  after: step.token_count_after.toLocaleString(),
                }}
              />
            )}
          </p>
        </EuiText>
      }
    />
  );
};

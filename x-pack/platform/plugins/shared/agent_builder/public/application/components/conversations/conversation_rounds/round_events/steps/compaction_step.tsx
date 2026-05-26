/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CompactionStep as CompactionStepData } from '@kbn/agent-builder-common';
import { StepLayout } from '../step_layout';

interface CompactionStepProps {
  step: CompactionStepData;
}

/**
 * Renders a `CompactionStep` as a static row.
 *
 * - In progress (`token_count_after === 0`): "Compacting context"
 * - Complete: "Context condensed: {before} → {after} tokens, {N} round(s)"
 *
 * All three numbers fit on the headline, so this step has no sub-fields and is
 * not clickable.
 */
export const CompactionStep: React.FC<CompactionStepProps> = ({ step }) => {
  const isInProgress = step.token_count_after === 0;

  return (
    <StepLayout
      label={
        <EuiText color="inherit">
          <p role="status" aria-live="polite">
            {isInProgress ? (
              <FormattedMessage
                id="xpack.agentBuilder.roundEvents.steps.compaction.inProgress"
                defaultMessage="Compacting context"
              />
            ) : (
              <FormattedMessage
                id="xpack.agentBuilder.roundEvents.steps.compaction.complete"
                defaultMessage="Context condensed: {before} → {after} tokens, {count, plural, one {# round} other {# rounds}}"
                values={{
                  before: step.token_count_before.toLocaleString(),
                  after: step.token_count_after.toLocaleString(),
                  count: step.summarized_round_count,
                }}
              />
            )}
          </p>
        </EuiText>
      }
    />
  );
};

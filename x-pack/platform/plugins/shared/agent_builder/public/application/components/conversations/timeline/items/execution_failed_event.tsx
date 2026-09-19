/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ExecutionFailedEvent as ExecutionFailedEventData } from '@kbn/agent-builder-common';
import { AGENT_BUILDER_UI_EBT, deserializeExecutionError } from '@kbn/agent-builder-common';
import { StepLayout } from '../../conversation_rounds/round_events/step_layout';
import { RoundError } from '../../conversation_rounds/round_error/round_error';

interface ExecutionFailedEventProps {
  event: ExecutionFailedEventData;
  onRetry?: () => void;
}

const label = i18n.translate('xpack.agentBuilder.conversation.timeline.executionFailed.label', {
  defaultMessage: 'An error occurred',
});

export const ExecutionFailedEvent: React.FC<ExecutionFailedEventProps> = ({ event, onRetry }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const error = useMemo(() => deserializeExecutionError(event.data.error), [event.data.error]);

  return (
    <div data-test-subj="agentBuilderExecutionFailed">
      <StepLayout
        label={
          <EuiText size="s" color="danger" data-test-subj="agentBuilderExecutionFailedToggle">
            <p>{label}</p>
          </EuiText>
        }
        onClick={() => setIsExpanded((expanded) => !expanded)}
        isExpanded={isExpanded}
        expansion={<RoundError error={error} onRetry={onRetry} />}
        ebtAction={AGENT_BUILDER_UI_EBT.action.conversation.EXPAND_EXECUTION_ERROR}
      />
    </div>
  );
};

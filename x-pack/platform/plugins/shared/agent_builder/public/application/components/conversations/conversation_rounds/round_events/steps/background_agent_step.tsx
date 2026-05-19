/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiBadge, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { BackgroundAgentCompleteStep as BackgroundAgentCompleteStepData } from '@kbn/agent-builder-common';
import { ExecutionStatus } from '@kbn/agent-builder-common';
import type { ToolResult } from '@kbn/agent-builder-common/tools/tool_result';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { StepLayout } from '../step_layout';
import { ViewResponseButton } from '../results/view_response_button';

const labels = {
  status: i18n.translate('xpack.agentBuilder.roundEvents.steps.backgroundAgent.statusLabel', {
    defaultMessage: 'Status',
  }),
  executionId: i18n.translate(
    'xpack.agentBuilder.roundEvents.steps.backgroundAgent.executionIdLabel',
    { defaultMessage: 'Execution ID' }
  ),
  completedAt: i18n.translate(
    'xpack.agentBuilder.roundEvents.steps.backgroundAgent.completedAtLabel',
    { defaultMessage: 'Completed at' }
  ),
};

interface BackgroundAgentStepProps {
  step: BackgroundAgentCompleteStepData;
}

/**
 * Renders a `BackgroundAgentCompleteStep`. Clickable to expand into sub-fields:
 *   - Status
 *   - Execution ID
 *   - Completed at (round_id, tool_call_group_id)
 *   - "View response" button → opens the generic `ToolResponseFlyout` with
 *     a JSON dump of the completion data (execution_id, status, response, error,
 *     completed_at). Matches the old behaviour of the deleted
 *     `BackgroundExecutionDisplay`.
 *
 * Note: the rich sub-agent execution view (nested steps + final response) is
 * accessible separately via the originating `run_subagent` tool call's
 * "View execution" button — see `tool_call_step.tsx`. Keeping these two
 * touch-points distinct means the completion step shows the *result data* and
 * the tool call shows the *execution trace*.
 *
 * Expansion state is local — no shared map needed.
 */
export const BackgroundAgentStep: React.FC<BackgroundAgentStepProps> = ({ step }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const onToggle = () => setIsExpanded((v) => !v);

  return (
    <StepLayout
      label={<BackgroundAgentHeadline step={step} />}
      onClick={onToggle}
      isExpanded={isExpanded}
      expansion={<BackgroundAgentExpansion step={step} />}
    />
  );
};

const BackgroundAgentHeadline: React.FC<{ step: BackgroundAgentCompleteStepData }> = ({ step }) => {
  const isFailure =
    step.status === ExecutionStatus.failed || step.status === ExecutionStatus.aborted;

  return (
    <EuiText color={isFailure ? 'danger' : 'inherit'}>
      <p role="status">
        {isFailure ? (
          <FormattedMessage
            id="xpack.agentBuilder.roundEvents.steps.backgroundAgent.failed"
            defaultMessage="Background agent {status}"
            values={{
              status: <EuiBadge color="danger">{step.status}</EuiBadge>,
            }}
          />
        ) : (
          <FormattedMessage
            id="xpack.agentBuilder.roundEvents.steps.backgroundAgent.completed"
            defaultMessage="Background agent completed"
          />
        )}
      </p>
    </EuiText>
  );
};

const BackgroundAgentExpansion: React.FC<{ step: BackgroundAgentCompleteStepData }> = ({
  step,
}) => {
  // Synthetic `ToolResult` of type `other` so `ToolResponseFlyout` can render
  // the completion payload via its existing JSON-dump path. Matches what the
  // old `round_steps.tsx` did via `openFlyout([{ type: ToolResultType.other, ... }])`.
  const syntheticResult: ToolResult = useMemo(
    () => ({
      type: ToolResultType.other,
      tool_result_id: `bg-${step.execution_id}`,
      data: {
        execution_id: step.execution_id,
        status: step.status,
        response: step.response,
        error: step.error,
        completed_at: step.completed_at,
      },
    }),
    [step]
  );

  return (
    <>
      <EuiText size="s">
        <p>
          <strong>{labels.status}:</strong> {step.status}
        </p>
        <p>
          <strong>{labels.executionId}:</strong> <code>{step.execution_id}</code>
        </p>
        {step.completed_at && (
          <p>
            <strong>{labels.completedAt}:</strong> <code>{step.completed_at.round_id}</code>
            {step.completed_at.tool_call_group_id && (
              <>
                {' '}
                / <code>{step.completed_at.tool_call_group_id}</code>
              </>
            )}
          </p>
        )}
      </EuiText>
      <EuiSpacer size="xs" />
      <ViewResponseButton results={[syntheticResult]} />
    </>
  );
};

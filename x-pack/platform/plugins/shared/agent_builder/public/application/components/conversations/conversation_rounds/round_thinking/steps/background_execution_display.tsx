/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, EuiLink, EuiBadge } from '@elastic/eui';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common/telemetry';
import { FormattedMessage } from '@kbn/i18n-react';
import type { BackgroundAgentCompleteStep } from '@kbn/agent-builder-common';
import { ExecutionStatus } from '@kbn/agent-builder-common';
import { ThinkingItemLayout } from './thinking_item_layout';

interface BackgroundExecutionDisplayProps {
  step: BackgroundAgentCompleteStep;
  onInspect: () => void;
  icon?: React.ReactNode;
  textColor?: string;
}

export const BackgroundExecutionDisplay: React.FC<BackgroundExecutionDisplayProps> = ({
  step,
  onInspect,
  icon,
  textColor,
}) => {
  const isError = step.status === ExecutionStatus.failed || step.status === ExecutionStatus.aborted;

  return (
    <ThinkingItemLayout icon={icon} textColor={textColor}>
      <EuiText size="s">
        <p role="status">
          {isError ? (
            <FormattedMessage
              id="xpack.agentBuilder.thinking.subagent.backgroundExecutionFailed"
              defaultMessage="Background agent execution {status}. {inspectResponse}"
              values={{
                status: <EuiBadge color="danger">{step.status}</EuiBadge>,
                inspectResponse: (
                  <EuiLink
                    onClick={onInspect}
                    role="button"
                    data-ebt-element={AGENT_BUILDER_UI_EBT.element.CONVERSATION_ROUND_THINKING}
                    data-ebt-action={
                      AGENT_BUILDER_UI_EBT.action.conversation.THINKING_TOOL_RESPONSE_INSPECT
                    }
                  >
                    <FormattedMessage
                      id="xpack.agentBuilder.thinking.inspectError"
                      defaultMessage="Inspect error"
                    />
                  </EuiLink>
                ),
              }}
            />
          ) : (
            <FormattedMessage
              id="xpack.agentBuilder.thinking.subagent.backgroundExecutionCompleted"
              defaultMessage="Background agent completed. {inspectResponse}"
              values={{
                inspectResponse: (
                  <EuiLink
                    onClick={onInspect}
                    role="button"
                    data-ebt-element={AGENT_BUILDER_UI_EBT.element.CONVERSATION_ROUND_THINKING}
                    data-ebt-action={
                      AGENT_BUILDER_UI_EBT.action.conversation.THINKING_TOOL_RESPONSE_INSPECT
                    }
                  >
                    <FormattedMessage
                      id="xpack.agentBuilder.thinking.inspectResponse"
                      defaultMessage="Inspect response"
                    />
                  </EuiLink>
                ),
              }}
            />
          )}
        </p>
      </EuiText>
    </ThinkingItemLayout>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  useEuiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { isErrorResult } from '@kbn/agent-builder-common/tools/tool_result';
import type { ToolCallStep as ToolCallStepData } from '@kbn/agent-builder-common/chat/conversation';

const toolCallAriaLabel = i18n.translate('xpack.agentBuilder.eventSteps.steps.toolCall.ariaLabel', {
  defaultMessage: 'Tool call',
});

const toolBadgeToolLabel = i18n.translate(
  'xpack.agentBuilder.eventSteps.steps.toolCall.toolBadgeToolLabel',
  { defaultMessage: 'tool' }
);

interface ToolCallStepHeadlineProps {
  step: ToolCallStepData;
  hasResults: boolean;
  isAborted?: boolean;
}

export const ToolCallStepHeadline: React.FC<ToolCallStepHeadlineProps> = ({
  step,
  hasResults,
  isAborted = false,
}) => {
  const { euiTheme } = useEuiTheme();
  const suffixFontSize = useEuiFontSize('s');
  const hasErrorResult = step.results.some(isErrorResult);

  const suffixStyles = css`
    ${suffixFontSize}
    color: ${hasErrorResult ? euiTheme.colors.textDanger : euiTheme.colors.textDisabled};
  `;

  const toolBadge = (
    <EuiBadge color={hasErrorResult ? 'danger' : 'default'}>
      <strong
        css={css`
          font-weight: ${euiTheme.font.weight.bold};
        `}
      >
        {toolBadgeToolLabel}
      </strong>
      : {step.tool_id}
    </EuiBadge>
  );

  return (
    <>
      <EuiFlexGroup
        responsive={false}
        gutterSize="xs"
        alignItems="baseline"
        role="status"
        aria-label={toolCallAriaLabel}
      >
        <EuiFlexItem grow={false}>{toolBadge}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <span css={suffixStyles}>
            {hasResults ? (
              <FormattedMessage
                id="xpack.agentBuilder.eventSteps.steps.toolCall.ran"
                defaultMessage="ran"
              />
            ) : isAborted ? (
              <FormattedMessage
                id="xpack.agentBuilder.eventSteps.steps.toolCall.stopped"
                defaultMessage="stopped"
              />
            ) : (
              <FormattedMessage
                id="xpack.agentBuilder.eventSteps.steps.toolCall.running"
                defaultMessage="running…"
              />
            )}
          </span>
        </EuiFlexItem>
      </EuiFlexGroup>
      {step.progression
        ?.filter((p) => !p.metadata?.agent_execution_id)
        .map((p, idx) => (
          <EuiText key={`progression-${idx}`} size="s">
            <p>
              <span
                css={css`
                  color: ${euiTheme.colors.textDisabled};
                `}
              >
                {p.message}
              </span>
            </p>
          </EuiText>
        ))}
    </>
  );
};

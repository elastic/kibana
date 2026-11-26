/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiText, useEuiFontSize, useEuiTheme } from '@elastic/eui';
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

  const intentStyles = css`
    min-width: 0;
    white-space: normal;
    overflow-wrap: anywhere;
  `;

  const badgeItemStyles = css`
    display: block;
    white-space: normal;
    overflow-wrap: anywhere;
  `;

  const toolBadge = (
    <EuiBadge
      color={hasErrorResult ? 'danger' : 'default'}
      title={`${toolBadgeToolLabel}: ${step.tool_id}`}
      data-test-subj="agentBuilderToolCallBadge"
    >
      <span css={badgeItemStyles}>
        <strong
          css={css`
            font-weight: ${euiTheme.font.weight.bold};
          `}
        >
          {toolBadgeToolLabel}
        </strong>
        : {step.tool_id}
      </span>
    </EuiBadge>
  );

  const shouldAppendStatus = hasErrorResult || (isAborted && !hasResults);

  return (
    <EuiText
      size="s"
      color="inherit"
      css={intentStyles}
      role="status"
      aria-label={toolCallAriaLabel}
    >
      {step.intent?.trim() ? (
        <span data-test-subj="agentBuilderToolCallIntent">{step.intent}</span>
      ) : (
        toolBadge
      )}
      {shouldAppendStatus && (
        <span css={suffixStyles}>
          {' — '}
          <span>
            {hasErrorResult ? (
              <FormattedMessage
                id="xpack.agentBuilder.eventSteps.steps.toolCall.failedLabel"
                defaultMessage="failed"
              />
            ) : (
              <FormattedMessage
                id="xpack.agentBuilder.eventSteps.steps.toolCall.stopped"
                defaultMessage="stopped"
              />
            )}
          </span>
        </span>
      )}
    </EuiText>
  );
};

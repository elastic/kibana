/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, useEuiFontSize, useEuiTheme } from '@elastic/eui';
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
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `;

  // the tool badge can be truncated (EuiBadge renders an ellipsis), but never takes more than half of the row
  const badgeItemStyles = css`
    min-width: 0;
    max-width: 50%;
  `;

  const statusItemStyles = css`
    flex-shrink: 0;
  `;

  const toolBadge = (
    <EuiBadge
      color={hasErrorResult ? 'danger' : 'default'}
      title={`${toolBadgeToolLabel}: ${step.tool_id}`}
      data-test-subj="agentBuilderToolCallBadge"
    >
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
        {step.intent ? (
          <EuiFlexItem
            grow={false}
            css={intentStyles}
            title={step.intent}
            data-test-subj="agentBuilderToolCallIntent"
          >
            {step.intent}
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem grow={false} css={badgeItemStyles}>
          {toolBadge}
        </EuiFlexItem>
        <EuiFlexItem grow={false} css={statusItemStyles}>
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
    </>
  );
};

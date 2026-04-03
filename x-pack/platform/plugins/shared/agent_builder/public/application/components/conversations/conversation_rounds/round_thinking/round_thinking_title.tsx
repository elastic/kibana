/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import type { ConversationRoundStep } from '@kbn/agent-builder-common';
import { isToolCallStep } from '@kbn/agent-builder-common';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { useSendMessage } from '../../../../context/send_message/send_message_context';
import { RoundIcon } from './round_icon';
import { lineClampStyles } from '../../../../../common.styles';
import { isStepToolCall, formatStepParams } from './steps/step_tool_terminal';

const STEP_TOOL_PREFIX = 'platform.workflows.step.';

const clampTextStyles = css`
  word-break: break-all;
  ${lineClampStyles(1)}
`;

const defaultThinkingLabel = i18n.translate('xpack.agentBuilder.conversation.thinking.label', {
  defaultMessage: 'Thinking…',
});
const thinkingCompletedLabel = i18n.translate(
  'xpack.agentBuilder.conversation.thinking.completedReasoning',
  {
    defaultMessage: 'Completed reasoning',
  }
);

interface RoundThinkingTitleProps {
  isLoading: boolean;
  hasSteps: boolean;
  onShow: () => void;
  steps: ConversationRoundStep[];
}

const MIN_HEIGHT = '40px';

export const RoundThinkingTitle = ({
  isLoading,
  hasSteps,
  onShow,
  steps,
}: RoundThinkingTitleProps) => {
  const { agentReasoning } = useSendMessage();
  const { euiTheme } = useEuiTheme();

  const lastStepToolCall = useMemo(() => {
    for (let i = steps.length - 1; i >= 0; i--) {
      const step = steps[i];
      if (isToolCallStep(step) && isStepToolCall(step.tool_id)) {
        const stepName = step.tool_id.replace(STEP_TOOL_PREFIX, '');
        const paramsStr = formatStepParams(stepName, step.params);
        return { stepName, commandLine: `${stepName} ${paramsStr}`.trim() };
      }
    }
    return null;
  }, [steps]);

  if (lastStepToolCall) {
    const stepIcon = isLoading ? (
      <EuiIcon type="playFilled" color="success" size="s" />
    ) : (
      <EuiIcon type="check" color="success" size="m" />
    );

    return (
      <EuiFlexGroup
        direction="row"
        justifyContent="spaceBetween"
        responsive={false}
        data-test-subj="agentBuilderThinkingToggle"
        onClick={hasSteps ? onShow : undefined}
        alignItems="center"
        css={css`
          min-height: ${MIN_HEIGHT};
          cursor: ${hasSteps ? 'pointer' : 'default'};
          &:hover {
            text-decoration: ${hasSteps ? 'underline' : 'none'};
          }
        `}
      >
        <EuiFlexGroup gutterSize="s" direction="row" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>{stepIcon}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <code
              css={css`
                font-size: 13px;
                line-height: 1.4;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              `}
            >
              <span
                css={css`
                  color: ${euiTheme.colors.successText};
                  font-weight: 700;
                `}
              >
                {'$ '}
              </span>
              <span
                css={css`
                  font-weight: 600;
                `}
              >
                {lastStepToolCall.commandLine}
              </span>
            </code>
          </EuiFlexItem>
          {hasSteps && <EuiIcon type="chevronSingleRight" color="subdued" size="m" />}
        </EuiFlexGroup>
      </EuiFlexGroup>
    );
  }

  let thinkingButtonLabel = thinkingCompletedLabel;
  if (isLoading) {
    thinkingButtonLabel = agentReasoning
      ? i18n.translate('xpack.agentBuilder.conversation.thinking.reasoningInProgress', {
          defaultMessage: '{reasoning}…',
          values: { reasoning: agentReasoning },
        })
      : defaultThinkingLabel;
  }

  return (
    <EuiFlexGroup
      direction="row"
      justifyContent="spaceBetween"
      responsive={false}
      data-test-subj="agentBuilderThinkingToggle"
      onClick={hasSteps ? onShow : undefined}
      alignItems="center"
      css={css`
        min-height: ${MIN_HEIGHT};
        cursor: ${hasSteps ? 'pointer' : 'default'};
        &:hover {
          text-decoration: ${hasSteps ? 'underline' : 'none'};
        }
      `}
    >
      <EuiFlexGroup gutterSize="s" direction="row" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <RoundIcon isLoading={isLoading} />
        </EuiFlexItem>
        <EuiText size="s" color="subdued" css={clampTextStyles}>
          <p>{thinkingButtonLabel}</p>
        </EuiText>
        {hasSteps && <EuiIcon type="chevronSingleRight" color="subdued" size="m" />}
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};

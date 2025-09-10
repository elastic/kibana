/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ConversationRoundStep } from '@kbn/onechat-common';
import React from 'react';
import { useSendMessage } from '../../../../context/send_message_context';
import type { Timer } from '../../../../hooks/use_timer';
import { RoundTimer } from './round_timer';
import { RoundSteps } from './steps/round_steps';

interface RoundThinkingProps {
  steps: ConversationRoundStep[];
  isLoading: boolean;
  timer: Timer;
}

const fullWidthStyles = css`
  width: 100%;
`;

const defaultThinkingLabel = i18n.translate('xpack.onechat.conversation.thinking.label', {
  defaultMessage: 'Thinking...',
});
const thinkingCompletedLabel = i18n.translate('xpack.onechat.conversation.thinking.completed', {
  defaultMessage: 'Thinking completed',
});

export const RoundThinking: React.FC<RoundThinkingProps> = ({ steps, isLoading, timer }) => {
  const { euiTheme } = useEuiTheme();
  const thinkingAccordionId = useGeneratedHtmlId({ prefix: 'roundThinkingAccordion' });
  const { toolProgress } = useSendMessage();

  if (steps.length === 0) {
    return timer.showTimer ? (
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <RoundTimer elapsedTime={timer.elapsedTime} isStopped={timer.isStopped} />
        </EuiFlexItem>
      </EuiFlexGroup>
    ) : null;
  }

  const accordionStyles = css`
    .euiAccordion__children {
      padding: ${euiTheme.size.s} 0;
    }
  `;

  let thinkingButtonLabel = thinkingCompletedLabel;
  if (isLoading) {
    // While this round is loading, show the progression message as the button label if available
    // Otherwise fallback to default thinking label
    thinkingButtonLabel = toolProgress ?? defaultThinkingLabel;
  }

  return (
    <EuiAccordion
      id={thinkingAccordionId}
      arrowDisplay="left"
      css={accordionStyles}
      buttonProps={{
        css: fullWidthStyles,
      }}
      buttonContent={thinkingButtonLabel}
      extraAction={
        timer.showTimer ? (
          <RoundTimer elapsedTime={timer.elapsedTime} isStopped={timer.isStopped} />
        ) : undefined
      }
    >
      <EuiPanel paddingSize="l" hasShadow={false} hasBorder={false} color="subdued">
        <RoundSteps steps={steps} />
      </EuiPanel>
    </EuiAccordion>
  );
};

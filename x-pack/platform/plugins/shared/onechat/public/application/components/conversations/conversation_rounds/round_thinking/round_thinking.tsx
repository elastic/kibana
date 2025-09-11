/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ConversationRound, ConversationRoundStep } from '@kbn/onechat-common';
import React, { useState } from 'react';
import { useSendMessage } from '../../../../context/send_message_context';
import type { Timer } from '../../../../hooks/use_timer';
import { RoundFlyout } from '../round_flyout';
import { RoundTimer } from './round_timer';
import { RoundSteps } from './steps/round_steps';

interface RoundThinkingProps {
  rawRound: ConversationRound;
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
const rawResponseButtonLabel = i18n.translate('xpack.onechat.conversation.rawResponseButton', {
  defaultMessage: 'View raw response',
});

export const RoundThinking: React.FC<RoundThinkingProps> = ({
  steps,
  isLoading,
  timer,
  rawRound,
}) => {
  const { euiTheme } = useEuiTheme();
  const thinkingAccordionId = useGeneratedHtmlId({ prefix: 'roundThinkingAccordion' });
  const { agentReasoning } = useSendMessage();
  const [showFlyout, setShowFlyout] = useState(false);

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
    // While this round is loading, show the agent reasoning as the button label if available
    // Otherwise fallback to default thinking label.
    // Agent reasoning can be reasoning directly from the agent or individual tool call progression
    thinkingButtonLabel = agentReasoning ?? defaultThinkingLabel;
  }
  const toggleFlyout = () => {
    setShowFlyout(!showFlyout);
  };

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
        {!isLoading && (
          <EuiButton iconType={'code'} color="primary" iconSide="left" onClick={toggleFlyout}>
            {rawResponseButtonLabel}
          </EuiButton>
        )}
      </EuiPanel>
      <RoundFlyout isOpen={showFlyout} onClose={toggleFlyout} rawRound={rawRound} />
    </EuiAccordion>
  );
};

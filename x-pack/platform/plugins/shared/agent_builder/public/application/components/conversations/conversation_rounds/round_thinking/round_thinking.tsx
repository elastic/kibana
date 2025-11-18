/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiButton, EuiPanel, useEuiTheme, useGeneratedHtmlId } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ConversationRound, ConversationRoundStep } from '@kbn/agent-builder-common';
import React, { useState } from 'react';
import { useSendMessage } from '../../../../context/send_message/send_message_context';
import { RoundFlyout } from '../round_flyout';
import { RoundSteps } from './steps/round_steps';
import { ThinkingTimeDisplay } from './thinking_time_display';

interface RoundThinkingProps {
  rawRound: ConversationRound;
  steps: ConversationRoundStep[];
  isLoading: boolean;
}

const buttonContentClassName = 'thinkingButtonContent';

const defaultThinkingLabel = i18n.translate('xpack.agentBuilder.conversation.thinking.label', {
  defaultMessage: 'Thinking...',
});
const thinkingCompletedLabel = i18n.translate('xpack.agentBuilder.conversation.thinking.completed', {
  defaultMessage: 'Thinking completed',
});
const rawResponseButtonLabel = i18n.translate('xpack.agentBuilder.conversation.rawResponseButton', {
  defaultMessage: 'View raw response',
});

export const RoundThinking: React.FC<RoundThinkingProps> = ({ steps, isLoading, rawRound }) => {
  const { euiTheme } = useEuiTheme();
  const thinkingButtonStyles = css`
    margin-right: ${euiTheme.size.xs};
    & .${buttonContentClassName} {
      /*
        From what I can tell this is by far the easiest solution to limit the content to one line.
        These CSS properties are supported by all modern browsers https://developer.mozilla.org/en-US/docs/Web/CSS/line-clamp
      */
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `;
  const thinkingAccordionId = useGeneratedHtmlId({ prefix: 'roundThinkingAccordion' });
  const { agentReasoning } = useSendMessage();
  const [showFlyout, setShowFlyout] = useState(false);

  if (steps.length === 0) {
    return null;
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
      data-test-subj="agentBuilderThinkingToggle"
      buttonProps={{
        css: thinkingButtonStyles,
      }}
      buttonContent={thinkingButtonLabel}
      buttonContentClassName={buttonContentClassName}
    >
      <EuiPanel paddingSize="l" hasShadow={false} hasBorder={false} color="subdued">
        <RoundSteps steps={steps} />
        {!isLoading && (
          <EuiButton iconType={'code'} color="primary" iconSide="left" onClick={toggleFlyout}>
            {rawResponseButtonLabel}
          </EuiButton>
        )}
        <ThinkingTimeDisplay timeToFirstToken={rawRound.time_to_first_token} />
      </EuiPanel>
      <RoundFlyout isOpen={showFlyout} onClose={toggleFlyout} rawRound={rawRound} />
    </EuiAccordion>
  );
};

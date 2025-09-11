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

const buttonContentClassName = 'thinkingButtonContent';

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
  const thinkingButtonStyles = css`
    margin-right: ${euiTheme.size.xs};
    & .${buttonContentClassName} {
      /*
      From what I can tell this is by far the easiest solution to limit the content to one line.
      Other solutions require managing the width of the content, changing for if the timer
      is displayed or not.
      These CSS properties are supported by all modern browsers https://developer.mozilla.org/en-US/docs/Web/CSS/line-clamp
    */
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `;
  const thinkingAccordionId = useGeneratedHtmlId({ prefix: 'roundThinkingAccordion' });
  const { toolProgress } = useSendMessage();
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
    // While this round is loading, show the progression message as the button label if available
    // Otherwise fallback to default thinking label
    thinkingButtonLabel = toolProgress ?? defaultThinkingLabel;
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
        css: thinkingButtonStyles,
      }}
      buttonContent={thinkingButtonLabel}
      buttonContentClassName={buttonContentClassName}
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

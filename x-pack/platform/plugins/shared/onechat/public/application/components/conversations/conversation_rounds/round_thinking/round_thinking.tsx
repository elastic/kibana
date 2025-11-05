/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiButton, EuiPanel, useEuiTheme, useGeneratedHtmlId } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ConversationRound, ConversationRoundStep } from '@kbn/onechat-common';
import type { PropsWithChildren, ReactNode } from 'react';
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useSendMessage } from '../../../../context/send_message/send_message_context';
import { RoundFlyout } from './round_flyout';
import { RoundSteps } from './steps/round_steps';
import { ThinkingTimeDisplay } from './thinking_time_display';
import { RetryButton } from './retry_button';

interface RoundThinkingProps {
  rawRound: ConversationRound;
  steps: ConversationRoundStep[];
  isLoading: boolean;
  error: unknown;
}

const buttonContentClassName = 'thinkingButtonContent';

const ThinkingLabel: React.FC<{ isLoading: boolean; isError: boolean }> = ({
  isLoading,
  isError,
}) => {
  const { agentReasoning } = useSendMessage();
  if (isLoading) {
    // While this round is loading, show the agent reasoning as the button label if available
    // Otherwise fallback to default thinking label.
    // Agent reasoning can be reasoning directly from the agent or individual tool call progression
    return (
      agentReasoning ?? (
        <FormattedMessage
          id="xpack.onechat.conversation.thinking.defaultLabel"
          defaultMessage="Thinking..."
        />
      )
    );
  }
  if (isError) {
    return (
      <FormattedMessage
        id="xpack.onechat.conversation.thinking.errorLabel"
        defaultMessage="There was an error, expand for detailed information."
      />
    );
  }
  return (
    <FormattedMessage
      id="xpack.onechat.conversation.thinking.completedLabel"
      defaultMessage="Thinking completed"
    />
  );
};

const ThinkingAccordion: React.FC<PropsWithChildren<{ label: ReactNode; isError: boolean }>> = ({
  children,
  label: buttonContent,
  isError,
}) => {
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
  const accordionStyles = css`
    .euiAccordion__children {
      padding: ${euiTheme.size.s} 0;
    }
  `;
  const thinkingAccordionId = useGeneratedHtmlId({ prefix: 'roundThinkingAccordion' });
  return (
    <EuiAccordion
      id={thinkingAccordionId}
      arrowDisplay="left"
      css={accordionStyles}
      data-test-subj={isError ? 'agentBuilderRoundError' : 'agentBuilderThinkingToggle'}
      buttonProps={{
        css: thinkingButtonStyles,
      }}
      buttonContent={buttonContent}
      extraAction={isError && <RetryButton />}
      buttonContentClassName={buttonContentClassName}
    >
      {children}
    </EuiAccordion>
  );
};

export const RoundThinking: React.FC<RoundThinkingProps> = ({
  steps,
  isLoading,
  rawRound,
  error,
}) => {
  const [showFlyout, setShowFlyout] = useState(false);

  const toggleFlyout = () => {
    setShowFlyout(!showFlyout);
  };

  const isError = Boolean(error);

  return (
    <ThinkingAccordion
      label={<ThinkingLabel isLoading={isLoading} isError={isError} />}
      isError={isError}
    >
      <EuiPanel paddingSize="l" hasShadow={false} hasBorder={false} color="subdued">
        <RoundSteps steps={steps} error={error} />
        {!isLoading && (
          <EuiButton iconType={'code'} color="primary" iconSide="left" onClick={toggleFlyout}>
            <FormattedMessage
              id="xpack.onechat.conversation.rawResponseButton"
              defaultMessage="View raw response"
            />
          </EuiButton>
        )}
        <ThinkingTimeDisplay timeToFirstToken={rawRound.time_to_first_token} />
      </EuiPanel>
      <RoundFlyout isOpen={showFlyout} onClose={toggleFlyout} rawRound={rawRound} />
    </ThinkingAccordion>
  );
};

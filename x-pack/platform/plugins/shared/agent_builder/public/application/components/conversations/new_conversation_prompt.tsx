/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiTitle, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { css, keyframes } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { ConversationInput } from './conversation_input/conversation_input';
import {
  conversationElementPaddingStyles,
  conversationElementWidthStyles,
} from './conversation.styles';
import { useConversationContext } from '../../context/conversation/conversation_context';
import { useTypewriterLoop } from './use_typewriter_loop';

const greetingPrefix = i18n.translate('xpack.agentBuilder.conversations.newConversationPrompt', {
  defaultMessage: 'How can I help you?',
});

const capabilityMessages = [
  i18n.translate('xpack.agentBuilder.conversations.newConversationPrompt.createDashboardsDetail', {
    defaultMessage: 'I can create dashboards',
  }),
  i18n.translate('xpack.agentBuilder.conversations.newConversationPrompt.analyzeIncidentsDetail', {
    defaultMessage: 'I can analyze incidents',
  }),
  i18n.translate(
    'xpack.agentBuilder.conversations.newConversationPrompt.investigateAnomaliesDetail',
    {
      defaultMessage: 'I can investigate anomalies',
    }
  ),
] as const;

const longestCapabilityMessage = capabilityMessages.reduce((longest, message) =>
  message.length > longest.length ? message : longest
);

const caretBlink = keyframes`
  0%, 49% {
    opacity: 1;
  }
  50%, 100% {
    opacity: 0;
  }
`;

export const NewConversationPrompt: React.FC<{}> = () => {
  const { euiTheme } = useEuiTheme();
  const { isEmbeddedContext, greetingMessage } = useConversationContext();
  const typedCapability = useTypewriterLoop({
    messages: capabilityMessages,
    enabled: greetingMessage === undefined,
  });

  const centerFlexItemStyles = css`
    justify-content: center;
    align-items: center;
    text-align: center;
    gap: ${euiTheme.size.base};
    padding: 0 ${euiTheme.size.base};
  `;

  const inputPaddingStyles = css`
    padding-bottom: ${euiTheme.size.base};
  `;

  const typedTextStyles = css`
    color: ${euiTheme.colors.primary};
    display: inline-grid;
    justify-items: start;
    text-align: left;
    vertical-align: baseline;
  `;

  const reservedWidthStyles = css`
    grid-area: 1 / 1;
    visibility: hidden;
    white-space: nowrap;
  `;

  const typedOverlayStyles = css`
    grid-area: 1 / 1;
    white-space: nowrap;
  `;

  const caretStyles = css`
    display: inline-block;
    width: 2px;
    height: 0.85em;
    margin-left: 2px;
    background-color: ${euiTheme.colors.primary};
    vertical-align: -0.08em;
    animation: ${caretBlink} 1s step-end infinite;

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  `;

  const greeting = greetingMessage ?? (
    <>
      {greetingPrefix}{' '}
      <span css={typedTextStyles} aria-hidden="true" data-test-subj="agentBuilderWelcomeTypedText">
        <span css={reservedWidthStyles}>
          {longestCapabilityMessage}
          <span css={caretStyles} />
        </span>
        <span css={typedOverlayStyles}>
          {typedCapability}
          <span css={caretStyles} />
        </span>
      </span>
    </>
  );

  return (
    <EuiFlexGroup
      responsive={false}
      alignItems="center"
      direction="column"
      justifyContent="center"
      gutterSize="l"
      css={conversationElementWidthStyles}
      data-test-subj="agentBuilderWelcomePage"
    >
      <EuiFlexItem grow={isEmbeddedContext ? true : false} css={centerFlexItemStyles}>
        <EuiTitle size="m">
          <h2>{greeting}</h2>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem
        grow={false}
        css={[conversationElementWidthStyles, conversationElementPaddingStyles, inputPaddingStyles]}
      >
        <ConversationInput />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

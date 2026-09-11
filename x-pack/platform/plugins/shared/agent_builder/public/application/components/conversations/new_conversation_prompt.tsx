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
import { useKibana } from '../../hooks/use_kibana';
import { useSpaceSolution } from '../../hooks/use_space_solution';
import { useTypewriterLoop } from './use_typewriter_loop';
import { getCapabilityMessagesForSolution } from './capability_messages';

const greetingPrefix = i18n.translate('xpack.agentBuilder.conversations.newConversationPrompt', {
  defaultMessage: 'How can I help you?',
});

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
  const {
    services: { plugins },
  } = useKibana();
  const spaceSolution = useSpaceSolution(plugins.spaces);
  const capabilityMessages = spaceSolution ? getCapabilityMessagesForSolution(spaceSolution) : [];
  const typedCapability = useTypewriterLoop({
    messages: capabilityMessages,
    // Wait until Solution View is known so we don't flash Classic messages then switch.
    enabled: greetingMessage === undefined && spaceSolution !== undefined,
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

  // Stack every candidate in one cell so reserved width matches the visually widest string.
  const reservedWidthStyles = css`
    grid-area: 1 / 1;
    visibility: hidden;
    display: inline-grid;
    justify-items: start;
  `;

  const reservedMessageStyles = css`
    grid-area: 1 / 1;
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
          {capabilityMessages.map((message) => (
            <span key={message} css={reservedMessageStyles}>
              {message}
              <span css={caretStyles} />
            </span>
          ))}
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

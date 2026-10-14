/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiTitle, type UseEuiTheme } from '@elastic/eui';
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

const typedTextStyles = ({ euiTheme }: UseEuiTheme) => css`
  color: ${euiTheme.colors.primary};
  display: inline-grid;
  justify-items: start;
  text-align: left;
  vertical-align: baseline;
`;

const caretStyles = ({ euiTheme }: UseEuiTheme) => css`
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

const centerFlexItemStyles = ({ euiTheme }: UseEuiTheme) => css`
  justify-content: center;
  align-items: center;
  text-align: center;
  gap: ${euiTheme.size.base};
  padding: 0 ${euiTheme.size.base};
`;

const inputPaddingStyles = ({ euiTheme }: UseEuiTheme) => css`
  padding-bottom: ${euiTheme.size.base};
`;

const TypedCapability: React.FC<{ messages: readonly string[]; enabled?: boolean }> = ({
  messages,
  enabled = true,
}) => {
  const typedText = useTypewriterLoop({ messages, enabled });

  return (
    <span css={typedTextStyles} aria-hidden="true" data-test-subj="agentBuilderWelcomeTypedText">
      <span css={reservedWidthStyles}>
        {messages.map((message) => (
          <span key={message} css={reservedMessageStyles}>
            {message}
            <span css={caretStyles} />
          </span>
        ))}
      </span>
      <span css={typedOverlayStyles}>
        {typedText}
        <span css={caretStyles} />
      </span>
    </span>
  );
};

export const NewConversationPrompt: React.FC<{}> = () => {
  const { isEmbeddedContext, greetingMessage } = useConversationContext();
  const {
    services: { plugins },
  } = useKibana();
  const spaceSolution = useSpaceSolution(plugins.spaces);
  const capabilityMessages =
    spaceSolution !== undefined ? getCapabilityMessagesForSolution(spaceSolution) : [];

  const greeting = greetingMessage ?? (
    <>
      {greetingPrefix}{' '}
      {spaceSolution !== undefined && <TypedCapability messages={capabilityMessages} />}
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
      <EuiFlexItem grow={isEmbeddedContext} css={centerFlexItemStyles}>
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

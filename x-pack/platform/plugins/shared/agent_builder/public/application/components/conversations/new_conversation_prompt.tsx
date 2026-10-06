/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiTitle, type UseEuiTheme } from '@elastic/eui';
import React, { useState } from 'react';
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
import { useNowrapFitsContainer } from './use_nowrap_fits_container';
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

const greetingHeadingStyles = css`
  position: relative;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: baseline;
  column-gap: 0.35em;
  row-gap: 0;
  text-align: center;
`;

const greetingPrefixStyles = css`
  max-width: 100%;
`;

const nowrapSizerStyles = css`
  position: absolute;
  visibility: hidden;
  pointer-events: none;
`;

const nowrapSizerLineStyles = css`
  display: block;
  white-space: nowrap;
`;

const reservedWidthStyles = css`
  grid-area: 1 / 1;
  visibility: hidden;
  display: inline-grid;
  justify-items: inherit;
  width: 100%;
`;

const reservedMessageStyles = css`
  grid-area: 1 / 1;
  white-space: nowrap;
`;

const typedOverlayStyles = css`
  grid-area: 1 / 1;
  white-space: nowrap;
`;

const wrappingMessageStyles = css`
  white-space: normal;
  overflow-wrap: break-word;
`;

const typedTextStyles = ({ euiTheme }: UseEuiTheme) => css`
  color: ${euiTheme.colors.primary};
  display: inline-grid;
  justify-items: start;
  text-align: left;
  vertical-align: baseline;
  min-width: 0;
  max-width: 100%;
`;

const typedTextWrapStyles = css`
  justify-items: center;
  text-align: center;
  flex: 1 1 100%;
  width: 100%;
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

const TypedCapability: React.FC<{
  messages: readonly string[];
  enabled?: boolean;
  wrapAndCenter?: boolean;
}> = ({ messages, enabled = true, wrapAndCenter = false }) => {
  const typedText = useTypewriterLoop({ messages, enabled });
  const wrappingStyles = wrapAndCenter ? wrappingMessageStyles : undefined;

  return (
    <span
      css={[typedTextStyles, wrapAndCenter && typedTextWrapStyles]}
      aria-hidden="true"
      data-test-subj="agentBuilderWelcomeTypedText"
      data-wrap-and-center={wrapAndCenter ? 'true' : undefined}
    >
      <span css={reservedWidthStyles}>
        {messages.map((message) => (
          <span key={message} css={[reservedMessageStyles, wrappingStyles]}>
            {message}
            <span css={caretStyles} />
          </span>
        ))}
      </span>
      <span css={[typedOverlayStyles, wrappingStyles]}>
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
  const [headingEl, setHeadingEl] = useState<HTMLHeadingElement | null>(null);
  const [sizerEl, setSizerEl] = useState<HTMLSpanElement | null>(null);
  const fitsOnOneLine = useNowrapFitsContainer(headingEl, sizerEl);
  const wrapAndCenter = !fitsOnOneLine;

  const greeting = greetingMessage ?? (
    <>
      {capabilityMessages.length > 0 && (
        <span ref={setSizerEl} css={nowrapSizerStyles} aria-hidden="true">
          {capabilityMessages.map((message) => (
            <span key={message} css={nowrapSizerLineStyles}>
              {greetingPrefix} {message}
              <span css={caretStyles} />
            </span>
          ))}
        </span>
      )}
      <span css={greetingPrefixStyles}>{greetingPrefix}</span>
      {spaceSolution !== undefined && (
        <TypedCapability messages={capabilityMessages} wrapAndCenter={wrapAndCenter} />
      )}
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
          <h2 ref={setHeadingEl} css={greetingHeadingStyles}>
            {greeting}
          </h2>
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

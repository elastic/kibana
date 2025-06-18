/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useRef, useEffect } from 'react';
import { css } from '@emotion/css';
import { EuiFlexItem, EuiPanel, useEuiTheme, euiScrollBarStyles } from '@elastic/eui';
import { ConversationEventChanges } from '../../../../common/chat_events';
import { useChat } from '../../hooks/use_chat';
import { useConversation } from '../../hooks/use_conversation';
import { useStickToBottom } from '../../hooks/use_stick_to_bottom';
import { useInitialMessage } from '../../context/initial_message_context';
import { ChatInputForm } from './chat_input_form';
import { ChatConversation } from './conversation/chat_conversation';
import { ChatNewConversationPrompt } from './chat_new_conversation_prompt';

interface ChatProps {
  agentId: string;
  conversationId: string | undefined;
  onConversationUpdate: (changes: ConversationEventChanges) => void;
}

const fullHeightClassName = css`
  height: 100%;
`;

const conversationPanelClass = css`
  min-height: 100%;
  max-width: 850px;
  margin-left: auto;
  margin-right: auto;
`;

const scrollContainerClassName = (scrollBarStyles: string) => css`
  overflow-y: auto;
  ${scrollBarStyles}
`;

export const Chat: React.FC<ChatProps> = ({ agentId, conversationId, onConversationUpdate }) => {
  const { conversation } = useConversation({ conversationId });
  const { initialMessage, clearInitialMessage } = useInitialMessage();
  const { sendMessage } = useChat({
    conversationId,
    agentId,
    onConversationUpdate,
  });

  useEffect(() => {
    if (initialMessage && agentId) {
      sendMessage(initialMessage);
      clearInitialMessage();
    }
  }, [initialMessage, agentId, sendMessage, clearInitialMessage]);

  const theme = useEuiTheme();
  const scrollBarStyles = euiScrollBarStyles(theme);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const { setStickToBottom } = useStickToBottom({
    defaultState: true,
    scrollContainer: scrollContainerRef.current,
  });

  useEffect(() => {
    setStickToBottom(true);
  }, [conversationId, setStickToBottom]);

  const onSubmit = useCallback(
    (message: string) => {
      setStickToBottom(true);
      sendMessage(message);
    },
    [sendMessage, setStickToBottom]
  );

  if (!conversationId && (!conversation || conversation.rounds.length === 0)) {
    return <ChatNewConversationPrompt onSubmit={onSubmit} />;
  }

  return (
    <>
      <EuiFlexItem grow className={scrollContainerClassName(scrollBarStyles)}>
        <div ref={scrollContainerRef} className={fullHeightClassName}>
          <EuiPanel hasBorder={false} hasShadow={false} className={conversationPanelClass}>
            <ChatConversation conversationRounds={conversation?.rounds ?? []} />
          </EuiPanel>
        </div>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <ChatInputForm disabled={!agentId} loading={false} onSubmit={onSubmit} />
      </EuiFlexItem>
    </>
  );
};

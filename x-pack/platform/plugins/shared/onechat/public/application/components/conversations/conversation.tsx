/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useRef, useEffect, useState } from 'react';
import { css } from '@emotion/css';
import { EuiFlexItem, EuiPanel, useEuiTheme, euiScrollBarStyles } from '@elastic/eui';
import { oneChatDefaultAgentId } from '@kbn/onechat-common';
import { useChat } from '../../hooks/use_chat';
import { useConversation } from '../../hooks/use_conversation';
import { useStickToBottom } from '../../hooks/use_stick_to_bottom';
import { ConversationInputForm } from './conversation_input_form';
import { ConversationRounds } from './conversation_rounds/conversation_rounds';
import { NewConversationPrompt } from './new_conversation_prompt';

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

interface ConversationProps {
  conversationId: string | undefined;
}

export const Conversation: React.FC<ConversationProps> = ({ conversationId }) => {
  const [selectedAgentId, setSelectedAgentId] = useState<string>(oneChatDefaultAgentId);

  const { conversation } = useConversation({ conversationId });

  const { agentId: conversationAgentId } = conversation ?? {};

  // We allow to change agent only at the start of the conversation
  const agentId = conversationId ? conversationAgentId ?? oneChatDefaultAgentId : selectedAgentId;

  const { sendMessage } = useChat({
    conversationId,
    agentId,
  });

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
    return (
      <NewConversationPrompt
        onSubmit={onSubmit}
        selectAgentId={setSelectedAgentId}
        agentId={selectedAgentId}
      />
    );
  }

  return (
    <>
      <EuiFlexItem grow className={scrollContainerClassName(scrollBarStyles)}>
        <div ref={scrollContainerRef} className={fullHeightClassName}>
          <EuiPanel hasBorder={false} hasShadow={false} className={conversationPanelClass}>
            <ConversationRounds conversationRounds={conversation?.rounds ?? []} />
          </EuiPanel>
        </div>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <ConversationInputForm
          disabled={!agentId}
          loading={false}
          onSubmit={onSubmit}
          selectedAgentId={agentId}
        />
      </EuiFlexItem>
    </>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, useEuiScrollBar } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useRef } from 'react';
import { useChat } from '../../hooks/use_chat';
import { useConversation } from '../../hooks/use_conversation';
import { useConversationId } from '../../hooks/use_conversation_id';
import { useStickToBottom } from '../../hooks/use_stick_to_bottom';
import { ConversationInputForm } from './conversation_input_form';
import { ConversationRounds } from './conversation_rounds/conversation_rounds';
import { NewConversationPrompt } from './new_conversation_prompt';
import { ConversationContent } from './conversation_grid';

const fullHeightStyles = css`
  height: 100%;
`;
const roundsContainerStyles = css`
  min-height: 100%;
  margin-left: auto;
  margin-right: auto;
`;

interface ConversationProps {
  agentId: string;
}

export const Conversation: React.FC<ConversationProps> = ({ agentId }) => {
  const { conversation } = useConversation();
  const { sendMessage } = useChat({ agentId });
  const conversationId = useConversationId();

  const scrollContainerStyles = css`
    overflow-y: auto;
    ${useEuiScrollBar()}
  `;

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
    return <NewConversationPrompt onSubmit={onSubmit} />;
  }

  return (
    <>
      <EuiFlexItem grow css={scrollContainerStyles}>
        <div ref={scrollContainerRef} css={fullHeightStyles}>
          <ConversationContent css={roundsContainerStyles}>
            <ConversationRounds conversationRounds={conversation?.rounds ?? []} />
          </ConversationContent>
        </div>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <ConversationContent>
          <ConversationInputForm disabled={!agentId} loading={false} onSubmit={onSubmit} />
        </ConversationContent>
      </EuiFlexItem>
    </>
  );
};

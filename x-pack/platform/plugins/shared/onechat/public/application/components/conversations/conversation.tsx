/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, useEuiScrollBar } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useRef } from 'react';
import { useConversation } from '../../hooks/use_conversation';
import { useStickToBottom } from '../../hooks/use_stick_to_bottom';
import { ConversationInputForm } from './conversation_input_form';
import { ConversationRounds } from './conversation_rounds/conversation_rounds';
import { NewConversationPrompt } from './new_conversation_prompt';

const conversationContainerStyles = css`
  width: 100%;
  height: 100%;
`;

export const Conversation: React.FC<{}> = () => {
  const { conversation, conversationId, hasActiveConversation } = useConversation();

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

  const onSubmit = useCallback(() => {
    setStickToBottom(true);
  }, [setStickToBottom]);

  return (
    <EuiFlexGroup
      css={conversationContainerStyles}
      direction="column"
      gutterSize="l"
      justifyContent="center"
      responsive={false}
    >
      {hasActiveConversation ? (
        <EuiFlexItem ref={scrollContainerRef} grow css={scrollContainerStyles}>
          <ConversationRounds conversationRounds={conversation?.rounds ?? []} />
        </EuiFlexItem>
      ) : (
        <EuiFlexItem grow>
          <NewConversationPrompt />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <ConversationInputForm onSubmit={onSubmit} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

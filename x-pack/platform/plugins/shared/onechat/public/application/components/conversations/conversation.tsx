/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiScrollBar } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useEffect, useRef } from 'react';
import { useHasActiveConversation } from '../../hooks/use_conversation';
import { useConversationId } from '../../hooks/use_conversation_id';
import { useStickToBottom } from '../../hooks/use_stick_to_bottom';
import { ConversationInputForm } from './conversation_input/conversation_input_form';
import { ConversationResizableContainer } from './conversation_resizable_container';
import { ConversationRounds } from './conversation_rounds/conversation_rounds';
import { NewConversationPrompt } from './new_conversation_prompt';

const fullHeightStyles = css`
  height: 100%;
`;

export const Conversation: React.FC<{}> = () => {
  const conversationId = useConversationId();
  const hasActiveConversation = useHasActiveConversation();

  const scrollContainerStyles = css`
    overflow-y: auto;
    ${fullHeightStyles}
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

  return (
    <ConversationResizableContainer
      content={
        hasActiveConversation ? (
          <div css={scrollContainerStyles}>
            <div ref={scrollContainerRef}>
              <ConversationRounds />
            </div>
          </div>
        ) : (
          <div css={fullHeightStyles}>
            <NewConversationPrompt />
          </div>
        )
      }
      input={(onInputHeightChange) => (
        <ConversationInputForm
          onSubmit={() => {
            setStickToBottom(true);
          }}
          onTextAreaHeightChange={onInputHeightChange}
        />
      )}
    />
  );
};

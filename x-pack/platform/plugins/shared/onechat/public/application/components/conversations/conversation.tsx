/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiResizableContainer, useEuiScrollBar } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useEffect, useRef, useState } from 'react';
import { useHasActiveConversation } from '../../hooks/use_conversation';
import { useStickToBottom } from '../../hooks/use_stick_to_bottom';
import { ConversationInputForm } from './conversation_input/conversation_input_form';
import { ConversationRounds } from './conversation_rounds/conversation_rounds';
import { NewConversationPrompt } from './new_conversation_prompt';
import { useConversationId } from '../../hooks/use_conversation_id';
import { useSyncAgentId } from '../../hooks/use_sync_agent_id';

const fullHeightStyles = css`
  height: 100%;
`;
const conversationContainerStyles = css`
  ${fullHeightStyles}
  width: 100%;
`;

export const Conversation: React.FC<{}> = () => {
  const [starterPrompt, setStarterPrompt] = useState('');

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

  useSyncAgentId();

  return (
    <EuiResizableContainer direction="vertical" css={conversationContainerStyles}>
      {(EuiResizablePanel, EuiResizableButton) => {
        return (
          <>
            {hasActiveConversation ? (
              <EuiResizablePanel initialSize={80}>
                <div css={scrollContainerStyles}>
                  <div ref={scrollContainerRef}>
                    <ConversationRounds />
                  </div>
                </div>
              </EuiResizablePanel>
            ) : (
              <EuiResizablePanel initialSize={80}>
                <div css={fullHeightStyles}>
                  <NewConversationPrompt setStarterPrompt={setStarterPrompt} />
                </div>
              </EuiResizablePanel>
            )}
            <EuiResizableButton />
            <EuiResizablePanel initialSize={20} minSize="20%">
              <ConversationInputForm
                starterPrompt={starterPrompt}
                onSubmit={() => {
                  setStickToBottom(true);
                }}
              />
            </EuiResizablePanel>
          </>
        );
      }}
    </EuiResizableContainer>
  );
};

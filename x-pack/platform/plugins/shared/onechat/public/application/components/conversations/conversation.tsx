/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiResizableContainer, useEuiScrollBar } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ConversationRound } from '@kbn/onechat-common';
import { useConversation } from '../../hooks/use_conversation';
import { useSendMessageMutation } from '../../hooks/use_send_message_mutation';
import { useStickToBottom } from '../../hooks/use_stick_to_bottom';
import { ConversationInputForm } from './conversation_input/conversation_input_form';
import { ConversationRounds } from './conversation_rounds/conversation_rounds';
import { NewConversationPrompt } from './new_conversation_prompt';

const fullHeightStyles = css`
  height: 100%;
`;
const conversationContainerStyles = css`
  ${fullHeightStyles}
  width: 100%;
`;

export const Conversation: React.FC<{}> = () => {
  const { conversation, conversationId, hasActiveConversation } = useConversation();
  const [message, setMessage] = useState<string>('');
  const { sendMessage, isResponseLoading, error, pendingMessage, retry } = useSendMessageMutation();

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

  const errorRound: ConversationRound | null = useMemo(() => {
    if (error && pendingMessage) {
      return {
        input: { message: pendingMessage },
        response: { message: '' },
        steps: [],
      };
    }
    return null;
  }, [error, pendingMessage]);

  const displayRounds = useMemo(() => {
    const baseRounds = conversation?.rounds ?? [];
    return errorRound ? [...baseRounds, errorRound] : baseRounds;
  }, [conversation?.rounds, errorRound]);

  return (
    <EuiResizableContainer direction="vertical" css={conversationContainerStyles}>
      {(EuiResizablePanel, EuiResizableButton) => {
        return (
          <>
            {hasActiveConversation ? (
              <EuiResizablePanel initialSize={80}>
                <div css={scrollContainerStyles}>
                  <div ref={scrollContainerRef}>
                    <ConversationRounds
                      rounds={displayRounds}
                      isResponseLoading={isResponseLoading}
                      error={error}
                      onRetry={() => {
                        retry();
                      }}
                    />
                  </div>
                </div>
              </EuiResizablePanel>
            ) : (
              <EuiResizablePanel initialSize={80}>
                <div css={fullHeightStyles}>
                  <NewConversationPrompt />
                </div>
              </EuiResizablePanel>
            )}
            <EuiResizableButton />
            <EuiResizablePanel initialSize={20} minSize="20%">
              <ConversationInputForm
                message={message}
                setMessage={setMessage}
                onSubmit={() => {
                  if (isResponseLoading || !message.trim()) {
                    return;
                  }
                  sendMessage({ message });
                  setMessage('');
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

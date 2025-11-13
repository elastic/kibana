/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, useEuiTheme, EuiButtonIcon } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useEffect, useRef } from 'react';
import { useHasActiveConversation } from '../../hooks/use_conversation';
import { ConversationInputForm } from './conversation_input/conversation_input_form';
import { ConversationRounds } from './conversation_rounds/conversation_rounds';
import { NewConversationPrompt } from './new_conversation_prompt';
import { useConversationId } from '../../context/conversation/use_conversation_id';
import { useShouldStickToBottom } from '../../context/conversation/use_should_stick_to_bottom';
import { useSendMessage } from '../../context/send_message/send_message_context';
import { useConversationScrollActions } from '../../hooks/use_conversation_scroll_actions';
import { useConversationStatus } from '../../hooks/use_conversation';
import { useSendPredefinedInitialMessage } from '../../hooks/use_initial_message';
import { maxConversationWidthStyles } from './conversation.styles';

const scrollContainerWrapperStyles = css`
  position: relative;
  min-height: 0;
`;

export const Conversation: React.FC<{}> = () => {
  const conversationId = useConversationId();
  const hasActiveConversation = useHasActiveConversation();
  const { euiTheme } = useEuiTheme();
  const { isResponseLoading } = useSendMessage();
  const { isFetched } = useConversationStatus();
  const shouldStickToBottom = useShouldStickToBottom();

  useSendPredefinedInitialMessage();

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const {
    showScrollButton,
    scrollToMostRecentRoundBottom,
    scrollToMostRecentRoundTop,
    stickToBottom,
  } = useConversationScrollActions({
    isResponseLoading,
    conversationId: conversationId || '',
    scrollContainer: scrollContainerRef.current,
  });

  const scrollContainerHeight = scrollContainerRef.current?.clientHeight ?? 0;

  // Stick to bottom only when user returns to an existing conversation (conversationId is defined and changes)
  useEffect(() => {
    if (isFetched && conversationId && shouldStickToBottom) {
      requestAnimationFrame(() => {
        stickToBottom();
      });
    }
  }, [stickToBottom, isFetched, conversationId, shouldStickToBottom]);

  const conversationContainerStyles = css`
    width: 100%;
    ${maxConversationWidthStyles}
    height: 100%;
    padding-bottom: ${euiTheme.size.l};
  `;

  const scrollContainerStyles = css`
    overflow-y: auto;
    height: 100%;
  `;

  const scrollDownButtonStyles = css`
    position: absolute;
    bottom: ${euiTheme.size.s};
    left: 50%;
    transform: translateX(-50%);
    z-index: 1;
  `;

  if (!hasActiveConversation) {
    return <NewConversationPrompt />;
  }

  return (
    <EuiFlexGroup direction="column" css={conversationContainerStyles}>
      <EuiFlexItem grow={true} css={scrollContainerWrapperStyles}>
        <div ref={scrollContainerRef} css={scrollContainerStyles}>
          <ConversationRounds scrollContainerHeight={scrollContainerHeight} />
        </div>
        {showScrollButton && (
          <EuiButtonIcon
            display="base"
            size="s"
            color="text"
            css={scrollDownButtonStyles}
            iconType="sortDown"
            aria-label="Scroll down"
            onClick={scrollToMostRecentRoundBottom}
          />
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <ConversationInputForm onSubmit={scrollToMostRecentRoundTop} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

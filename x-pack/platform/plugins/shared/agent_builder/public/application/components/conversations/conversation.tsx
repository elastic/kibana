/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  useEuiOverflowScroll,
  useEuiScrollBar,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useEffect, useRef } from 'react';
import { useConversationError, useHasActiveConversation } from '../../hooks/use_conversation';
import { ConversationInput } from './conversation_input/conversation_input';
import { ConversationRounds } from './conversation_rounds/conversation_rounds';
import { NewConversationPrompt } from './new_conversation_prompt';
import { useConversationId } from '../../context/conversation/use_conversation_id';
import { useShouldStickToBottom } from '../../context/conversation/use_should_stick_to_bottom';
import { useSendMessage } from '../../context/send_message/send_message_context';
import { useConversationScrollActions } from '../../hooks/use_conversation_scroll_actions';
import { useConversationStatus } from '../../hooks/use_conversation';
import { useSendPredefinedInitialMessage } from '../../hooks/use_initial_message';
import {
  conversationElementPaddingStyles,
  conversationElementWidthStyles,
  fullWidthAndHeightStyles,
} from './conversation.styles';
import { ScrollButton } from './scroll_button';
import { useAppLeave } from '../../context/app_leave_context';
import { useNavigationAbort } from '../../hooks/use_navigation_abort';
import { ErrorPrompt } from '../common/prompt/error_prompt';
import { PROMPT_LAYOUT_VARIANTS } from '../common/prompt/layout';
import { StartNewConversationButton } from './actions/start_new_conversation_button';

export const Conversation: React.FC<{}> = () => {
  const { euiTheme } = useEuiTheme();
  const conversationId = useConversationId();
  const hasActiveConversation = useHasActiveConversation();
  const { isResponseLoading } = useSendMessage();
  const { isFetched } = useConversationStatus();
  const { errorType } = useConversationError();
  const shouldStickToBottom = useShouldStickToBottom();
  const onAppLeave = useAppLeave();

  useSendPredefinedInitialMessage();

  useNavigationAbort({
    onAppLeave,
    isResponseLoading,
  });

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const { showScrollButton, smoothScrollToBottom, scrollToMostRecentRoundTop, stickToBottom } =
    useConversationScrollActions({
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

  const containerStyles = css`
    ${fullWidthAndHeightStyles}
  `;

  const scrollMaskHeight = euiTheme.size.l;

  // Necessary to position the scroll button absolute to the container.
  const scrollWrapperStyles = css`
    ${fullWidthAndHeightStyles}
    position: relative;
    min-height: 0;

    &::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: ${scrollMaskHeight};
      pointer-events: none;
      z-index: 1;
      background: linear-gradient(to top, ${euiTheme.colors.backgroundBasePlain}, transparent);
    }
  `;

  const scrollableStyles = css`
    ${useEuiScrollBar()}
    ${useEuiOverflowScroll('y')}
  `;

  const inputPaddingStyles = css`
    padding-bottom: ${euiTheme.size.base};
  `;

  if (!hasActiveConversation) {
    return <NewConversationPrompt />;
  }

  if (errorType) {
    return (
      <ErrorPrompt
        errorType={errorType}
        variant={PROMPT_LAYOUT_VARIANTS.EMBEDDABLE}
        primaryButton={<StartNewConversationButton />}
      />
    );
  }

  return (
    <EuiFlexGroup direction="column" alignItems="center" css={containerStyles} gutterSize="s">
      <EuiFlexItem grow={true} css={scrollWrapperStyles}>
        <EuiFlexGroup
          direction="column"
          alignItems="center"
          ref={scrollContainerRef}
          css={scrollableStyles}
        >
          <EuiFlexItem css={[conversationElementWidthStyles, conversationElementPaddingStyles]}>
            <ConversationRounds scrollContainerHeight={scrollContainerHeight} />
          </EuiFlexItem>
        </EuiFlexGroup>
        {showScrollButton && <ScrollButton onClick={smoothScrollToBottom} />}
      </EuiFlexItem>
      <EuiFlexItem
        css={[conversationElementWidthStyles, conversationElementPaddingStyles, inputPaddingStyles]}
        grow={false}
      >
        <ConversationInput onSubmit={scrollToMostRecentRoundTop} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

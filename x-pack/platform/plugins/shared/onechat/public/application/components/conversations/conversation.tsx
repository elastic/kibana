/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiResizableContainer, useEuiScrollBar, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useEffect, useRef, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { useLocation } from 'react-router-dom';
import { useHasActiveConversation } from '../../hooks/use_conversation';
import { ConversationInputForm } from './conversation_input/conversation_input_form';
import { ConversationRounds } from './conversation_rounds/conversation_rounds';
import { NewConversationPrompt } from './new_conversation_prompt';
import { useSyncAgentId } from '../../hooks/use_sync_agent_id';
import { useOnechatServices } from '../../hooks/use_onechat_service';
import type { ConversationSettings } from '../../../services/types';
import { useConversationId } from '../../hooks/use_conversation_id';
import { useSendMessage } from '../../context/send_message/send_message_context';
import { useConversationScrollActions } from '../../hooks/use_conversation_scroll_actions';
import { useConversationStatus } from '../../hooks/use_conversation';
import { ConversationContent } from './conversation_grid';
import type { LocationState } from '../../hooks/use_navigation';

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
  const { euiTheme } = useEuiTheme();
  const { isResponseLoading } = useSendMessage();
  const { isFetched } = useConversationStatus();
  const { conversationSettingsService } = useOnechatServices();

  // Subscribe to conversation settings to get the newConversationSubtitle
  const conversationSettings = useObservable<ConversationSettings>(
    conversationSettingsService.getConversationSettings$(),
    {}
  );
  const location = useLocation<LocationState>();

  const shouldStickToBottom = location.state?.shouldStickToBottom ?? true;

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

  const scrollContainerStyles = css`
    overflow-y: auto;
    ${fullHeightStyles}
    ${useEuiScrollBar()}
  `;

  useSyncAgentId();

  const scrollDownButtonStyles = css`
    position: absolute;
    bottom: ${euiTheme.size.xl};
    left: 50%;
    transform: translateX(-50%);
  `;
  const contentStyles = css`
    ${fullHeightStyles}
    align-items: stretch;
  `;

  if (!hasActiveConversation) {
    return <NewConversationPrompt />;
  }

  return (
    <EuiResizableContainer direction="vertical" css={conversationContainerStyles}>
      {(EuiResizablePanel, EuiResizableButton) => {
        return (
          <>
            {hasActiveConversation ? (
              <EuiResizablePanel initialSize={80}>
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
              {conversationSettings?.selectedContextComponent ?? null}
              <ConversationInputForm
                starterPrompt={starterPrompt}
                contextPrompt={conversationSettings?.contextPrompt}
                onSubmit={() => {
                  scrollToMostRecentRoundTop();
                }}
              />
              <ConversationContent css={contentStyles}>
                <ConversationInputForm onSubmit={scrollToMostRecentRoundTop} />
              </ConversationContent>
            </EuiResizablePanel>
          </>
        );
      }}
    </EuiResizableContainer>
  );
};

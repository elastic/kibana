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
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  useConversation,
  useConversationError,
  useHasActiveConversation,
} from '../../hooks/use_conversation';
import { ConversationInput } from './conversation_input/conversation_input';
import type { MessageEditorInstance } from './conversation_input/message_editor';
import { ConversationRounds } from './conversation_rounds/conversation_rounds';
import { NewConversationPrompt } from './new_conversation_prompt';
import { useConversationId } from '../../context/conversation/use_conversation_id';
import { useShouldStickToBottom } from '../../context/conversation/use_should_stick_to_bottom';
import { useSendMessage } from '../../context/send_message/send_message_context';
import { useConversationScrollActions } from '../../hooks/use_conversation_scroll_actions';
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
import { PlanPanel } from './plan_panel';
import { ModeSuggestionBanner } from './mode_suggestion_banner';
import { useExperimentalFeatures } from '../../hooks/use_experimental_features';

export const Conversation: React.FC<{}> = () => {
  const { euiTheme } = useEuiTheme();
  const conversationId = useConversationId();
  const hasActiveConversation = useHasActiveConversation();
  const {
    isResponseLoading,
    sendMessage,
    plan,
    setPlan,
    agentMode,
    setAgentMode,
    modeSuggestion,
    setModeSuggestion,
  } = useSendMessage();
  const { conversation, isFetched } = useConversation();
  const { errorType } = useConversationError();
  const shouldStickToBottom = useShouldStickToBottom();
  const onAppLeave = useAppLeave();
  const experimentalFeatures = useExperimentalFeatures();

  useSendPredefinedInitialMessage();

  // Track previous conversation ID to detect genuine conversation switches
  // (not the initial undefined → new ID transition when a conversation is first created)
  const [prevConversationId, setPrevConversationId] = useState<string | undefined>(conversationId);

  useEffect(() => {
    if (conversationId !== prevConversationId) {
      const isNewConversationCreated = !prevConversationId && conversationId;
      setPrevConversationId(conversationId);

      // Only reset planning state when genuinely switching conversations,
      // not when the current conversation is first created from /new
      if (!isNewConversationCreated) {
        setPlan(undefined);
        setModeSuggestion(undefined);
        setAgentMode('agent');
        hasFetchedPlanRef.current = false;
      }
    }
  }, [conversationId, prevConversationId, setPlan, setModeSuggestion, setAgentMode]);

  // Restore plan state from conversation when loading an existing conversation.
  // Only run on the initial fetch — do not overwrite live streaming updates on refetches.
  const hasFetchedPlanRef = useRef(false);
  useEffect(() => {
    if (isFetched && !hasFetchedPlanRef.current) {
      hasFetchedPlanRef.current = true;
      if (conversation?.state?.plan) {
        setPlan(conversation.state.plan);
      }
    }
  }, [isFetched, conversation, setPlan]);

  useNavigationAbort({
    onAppLeave,
    isResponseLoading,
  });

  const messageEditorRef = useRef<MessageEditorInstance | null>(null);
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

  const handleApproveAndExecute = useCallback(() => {
    if (plan) {
      setPlan({ ...plan, status: 'ready' });
    }
    setAgentMode('agent');
    messageEditorRef.current?.clear();
    sendMessage({ message: 'Execute the plan.', agentModeOverride: 'agent' });
  }, [plan, setPlan, setAgentMode, sendMessage]);

  const handlePlanItemClick = useCallback((index: number, description: string) => {
    const truncatedDescription =
      description.length > 50 ? description.substring(0, 50) + '...' : description;
    messageEditorRef.current?.setContent(`Regarding step ${index + 1} (${truncatedDescription}): `);
    messageEditorRef.current?.focus();
  }, []);

  const handleAcceptModeSuggestion = useCallback(() => {
    setAgentMode('planning');
    setModeSuggestion(undefined);
  }, [setAgentMode, setModeSuggestion]);

  const handleDismissModeSuggestion = useCallback(() => {
    setModeSuggestion(undefined);
  }, [setModeSuggestion]);

  const showPlanPanel = experimentalFeatures.planning && plan && hasActiveConversation;
  const showModeSuggestion =
    experimentalFeatures.planning && modeSuggestion && hasActiveConversation;

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

  const modeSuggestionBanner = showModeSuggestion ? (
    <EuiFlexItem
      css={[conversationElementWidthStyles, conversationElementPaddingStyles]}
      grow={false}
    >
      <ModeSuggestionBanner
        reason={modeSuggestion.reason}
        onAccept={handleAcceptModeSuggestion}
        onDismiss={handleDismissModeSuggestion}
      />
    </EuiFlexItem>
  ) : null;

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
      {modeSuggestionBanner}
      {showPlanPanel && (
        <EuiFlexItem
          css={[conversationElementWidthStyles, conversationElementPaddingStyles]}
          grow={false}
        >
          <PlanPanel
            plan={plan}
            agentMode={agentMode}
            onApproveAndExecute={handleApproveAndExecute}
            onItemClick={handlePlanItemClick}
            isExecuting={isResponseLoading}
          />
        </EuiFlexItem>
      )}
      <EuiFlexItem
        css={[conversationElementWidthStyles, conversationElementPaddingStyles, inputPaddingStyles]}
        grow={false}
      >
        <ConversationInput
          onSubmit={scrollToMostRecentRoundTop}
          messageEditorRef={messageEditorRef}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

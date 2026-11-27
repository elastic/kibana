/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { InvestigationRecord } from '../../../../common/investigations/types';
import { ICONS } from '../../icons';
import { CollapseButton } from './collapse_button';
import { CreateClaimFromConversation } from './create_claim_from_conversation';
import { EmbeddedChat } from './embedded_chat';
import { NewThreadModal } from './new_thread_modal';
import { ParticipantAvatars } from './participant_avatars';
import { SuggestionChips } from './suggestion_chips';
import { ThreadBar } from './thread_bar';
import { ThreadSummary } from './thread_summary';
import { ThreadsMenu } from './threads_menu';
import { useCollapseToSideChat } from './use_collapse_to_side_chat';
import { useConversationMessages } from './use_conversation';
import { useFillViewportHeight } from './use_fill_viewport_height';
import { useSelectedConversation } from './use_selected_conversation';
import * as i18n from './translations';

const MIN_HEIGHT = 480;
/** The tab body has padding below the chat; keep the chat clear of it. */
const PAGE_BOTTOM_GAP = 32;

export interface AgentConversationProps {
  record: InvestigationRecord;
  /** The main Agent Builder conversation of the record. */
  mainConversationId: string;
  /** A thread's conversation id to open, e.g. from an Activity link. */
  requestedConversationId?: string;
}

/** The Conversation tab for an AI record: the real Agent Builder conversation, threads and claims. */
export const AgentConversation: React.FC<AgentConversationProps> = ({
  record,
  mainConversationId,
  requestedConversationId,
}) => {
  const { euiTheme } = useEuiTheme();
  const { ref, height } = useFillViewportHeight(MIN_HEIGHT, PAGE_BOTTOM_GAP);
  const collapse = useCollapseToSideChat();
  const { conversationId, thread, select, selectMain } = useSelectedConversation(
    record,
    mainConversationId,
    requestedConversationId
  );
  // Bumped after the agent wrote into the conversation from outside the embedded chat, to reload it.
  const [chatRevision, setChatRevision] = useState(0);
  const [isNewThreadOpen, setIsNewThreadOpen] = useState(false);
  const { messages: mainMessages } = useConversationMessages(record, mainConversationId);
  const { messages } = useConversationMessages(record, conversationId);
  const reloadChat = () => setChatRevision((revision) => revision + 1);

  const renderToolbar = (summaryButton: React.ReactNode) => (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      wrap
      responsive={false}
      role="toolbar"
      aria-label={i18n.TOOLBAR_LABEL}
      css={css`
        flex: 0 0 auto;
      `}
      data-test-subj="investigationConversationToolbar"
    >
      <EuiFlexItem grow={false}>
        <ThreadsMenu
          record={record}
          selectedConversationId={conversationId}
          onSelect={select}
          onNewThread={() => setIsNewThreadOpen(true)}
          canCreateThread
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size="s"
          iconType={ICONS.add}
          onClick={() => setIsNewThreadOpen(true)}
          data-test-subj="investigationNewThreadButton"
        >
          {i18n.NEW_THREAD}
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <CreateClaimFromConversation record={record} conversationId={conversationId} />
      </EuiFlexItem>
      {summaryButton ? <EuiFlexItem grow={false}>{summaryButton}</EuiFlexItem> : null}
      <EuiFlexItem grow />
      <EuiFlexItem grow={false}>
        <ParticipantAvatars participants={record.participants} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <CollapseButton />
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const renderBody = (toolbar: React.ReactNode, callout: React.ReactNode) => (
    <>
      {toolbar}
      {callout}
      <EuiText
        size="xs"
        color="subdued"
        css={css`
          flex: 0 0 auto;
        `}
      >
        <span data-test-subj="investigationConversationMessageCount">
          {i18n.MESSAGES_COUNT(messages.length)}
        </span>
        {' · '}
        <span data-test-subj="investigationConversationSwitchHint">
          {i18n.SWITCH_HINT(record.display_id)}
        </span>
        {' · '}
        {i18n.HEADER_HINT}
      </EuiText>
      {thread ? (
        <div
          css={css`
            flex: 0 0 auto;
          `}
        >
          <ThreadBar thread={thread} onBack={selectMain} hideTitle />
        </div>
      ) : null}
      <SuggestionChips record={record} conversationId={conversationId} onSent={reloadChat} />
      <div
        css={css`
          flex: 1 1 auto;
          min-block-size: 24rem;
          border: ${euiTheme.border.thin};
          border-radius: ${euiTheme.border.radius.medium};
          overflow: hidden;
        `}
        data-test-subj="investigationConversationBody"
      >
        <EmbeddedChat
          key={`${conversationId}-${chatRevision}`}
          record={record}
          conversationId={conversationId}
          onClose={collapse}
        />
      </div>
    </>
  );

  return (
    <div
      ref={ref}
      style={{ blockSize: height }}
      css={css`
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.s};
      `}
      data-test-subj="investigationConversationTab"
    >
      {thread ? (
        <ThreadSummary record={record} thread={thread} onAgentSummarized={reloadChat}>
          {({ button, callout }) => renderBody(renderToolbar(button), callout)}
        </ThreadSummary>
      ) : (
        renderBody(renderToolbar(null), null)
      )}
      {isNewThreadOpen ? (
        <NewThreadModal
          record={record}
          messages={mainMessages}
          onCreated={(created) => {
            setIsNewThreadOpen(false);
            select(created.conversation_id);
          }}
          onClose={() => setIsNewThreadOpen(false)}
        />
      ) : null}
    </div>
  );
};
AgentConversation.displayName = 'AgentConversation';

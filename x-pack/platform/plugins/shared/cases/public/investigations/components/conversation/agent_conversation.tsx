/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { InvestigationRecord } from '../../../../common/investigations/types';
import { CreateClaimFromConversation } from './create_claim_from_conversation';
import { EmbeddedChat } from './embedded_chat';
import { NewThreadModal } from './new_thread_modal';
import { ParticipantAvatars } from './participant_avatars';
import { ThreadBar } from './thread_bar';
import { ThreadSummary } from './thread_summary';
import { ThreadsMenu } from './threads_menu';
import { useConversationMessages } from './use_conversation';
import { useFillViewportHeight } from './use_fill_viewport_height';
import { useSelectedConversation } from './use_selected_conversation';
import * as i18n from './translations';

const MIN_HEIGHT = 560;
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
  const { conversationId, thread, select, selectMain } = useSelectedConversation(
    record,
    mainConversationId,
    requestedConversationId
  );
  // Bumped after the agent writes into a thread from outside the embedded chat, to reload it.
  const [chatRevision, setChatRevision] = useState(0);
  const [isNewThreadOpen, setIsNewThreadOpen] = useState(false);
  const { messages: mainMessages } = useConversationMessages(record, mainConversationId);
  const { messages, conversation } = useConversationMessages(record, conversationId);

  const title =
    thread?.title ?? conversation?.title ?? i18n.MAIN_CONVERSATION_TITLE(record.display_id);

  return (
    <div
      ref={ref}
      style={{ blockSize: height }}
      css={css`
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.m};
      `}
      data-test-subj="investigationConversationTab"
    >
      <EuiFlexGroup
        gutterSize="m"
        alignItems="center"
        justifyContent="spaceBetween"
        wrap
        responsive={false}
        css={css`
          flex: 0 0 auto;
        `}
      >
        <EuiFlexItem
          css={css`
            min-inline-size: 14rem;
          `}
        >
          <EuiTitle size="xs">
            <h2 data-test-subj="investigationConversationTitle">{title}</h2>
          </EuiTitle>
          <EuiText size="xs" color="subdued">
            <span data-test-subj="investigationConversationMessageCount">
              {i18n.MESSAGES_COUNT(messages.length)}
            </span>
            {' · '}
            {i18n.HEADER_HINT}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="m" alignItems="center" wrap responsive={false}>
            <EuiFlexItem grow={false}>
              <ParticipantAvatars participants={record.participants} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <CreateClaimFromConversation record={record} conversationId={conversationId} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <ThreadsMenu
                record={record}
                selectedConversationId={conversationId}
                onSelect={select}
                onNewThread={() => setIsNewThreadOpen(true)}
                canCreateThread
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      {thread ? (
        <div
          css={css`
            flex: 0 0 auto;
          `}
        >
          <ThreadBar
            thread={thread}
            onBack={selectMain}
            actions={
              <ThreadSummary
                record={record}
                thread={thread}
                onAgentSummarized={() => setChatRevision((revision) => revision + 1)}
              />
            }
          />
        </div>
      ) : null}
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
        />
      </div>
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

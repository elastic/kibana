/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { InvestigationRecord } from '../../../../common/investigations/types';
import { useInvestigationsNavigation } from '../../hooks';
import { ICONS } from '../../icons';
import { EmbeddedChat } from '../conversation/embedded_chat';
import { TeamDiscussion } from '../conversation/team_discussion';
import { ThreadBar } from '../conversation/thread_bar';
import { ThreadsMenu } from '../conversation/threads_menu';
import { useConversationMessages } from '../conversation/use_conversation';
import { useConversationMode } from '../conversation/use_conversation_mode';
import { useFillViewportHeight } from '../conversation/use_fill_viewport_height';
import { useSelectedConversation } from '../conversation/use_selected_conversation';
import { useTeamDiscussion } from '../conversation/use_team_discussion';
import * as conversationI18n from '../conversation/translations';

export interface SideChatProps {
  record: InvestigationRecord;
  agentAvailable: boolean;
}

interface ChatBarProps {
  /** Shown before the Expand button, e.g. the threads menu. */
  leading?: React.ReactNode;
  countLabel: string;
  onExpand: () => void;
}

const ChatBar: React.FC<ChatBarProps> = ({ leading, countLabel, onExpand }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      justifyContent="spaceBetween"
      responsive={false}
      css={css`
        flex: 0 0 auto;
        padding-block-end: ${euiTheme.size.s};
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued" data-test-subj="investigationSideChatCount">
          {countLabel}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          {leading ? <EuiFlexItem grow={false}>{leading}</EuiFlexItem> : null}
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              iconType={ICONS.chevronLeft}
              aria-label={conversationI18n.EXPAND_ARIA}
              onClick={onExpand}
              data-test-subj="investigationSideChatExpand"
            >
              {conversationI18n.EXPAND}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
ChatBar.displayName = 'ChatBar';

const MIN_HEIGHT = 420;
/** The side panel content has padding below the chat plus the panel bar above it. */
const PAGE_BOTTOM_GAP = 32;

const Frame: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { ref, height } = useFillViewportHeight(MIN_HEIGHT, PAGE_BOTTOM_GAP);

  return (
    <div
      ref={ref}
      style={{ blockSize: height }}
      css={css`
        display: flex;
        flex-direction: column;
      `}
      data-test-subj="investigationSideChat"
    >
      {children}
    </div>
  );
};
Frame.displayName = 'Frame';

const AgentSideChat: React.FC<{ record: InvestigationRecord; mainConversationId: string }> = ({
  record,
  mainConversationId,
}) => {
  const { euiTheme } = useEuiTheme();
  const { goToRecord } = useInvestigationsNavigation();
  const { conversationId, thread, select, selectMain } = useSelectedConversation(
    record,
    mainConversationId
  );
  const { messages, conversation } = useConversationMessages(record, conversationId);

  return (
    <Frame>
      <ChatBar
        countLabel={conversation ? conversationI18n.MESSAGES_COUNT(messages.length) : ''}
        leading={
          <ThreadsMenu
            record={record}
            selectedConversationId={conversationId}
            onSelect={select}
            onNewThread={() => undefined}
            canCreateThread={false}
          />
        }
        onExpand={() =>
          goToRecord(record.id, {
            tab: 'conversation',
            itemId: thread ? thread.conversation_id : undefined,
          })
        }
      />
      {thread ? (
        <div
          css={css`
            flex: 0 0 auto;
            padding-block-end: ${euiTheme.size.s};
          `}
        >
          <ThreadBar thread={thread} onBack={selectMain} compact />
        </div>
      ) : null}
      <div
        css={css`
          flex: 1 1 auto;
          min-block-size: 0;
          border: ${euiTheme.border.thin};
          border-radius: ${euiTheme.border.radius.medium};
          overflow: hidden;
        `}
      >
        <EmbeddedChat key={conversationId} record={record} conversationId={conversationId} />
      </div>
    </Frame>
  );
};
AgentSideChat.displayName = 'AgentSideChat';

const TeamSideChat: React.FC<{ record: InvestigationRecord }> = ({ record }) => {
  const { goToRecord } = useInvestigationsNavigation();
  const { messageCount } = useTeamDiscussion(record);

  return (
    <Frame>
      <ChatBar
        countLabel={conversationI18n.TEAM_MESSAGE_COUNT(messageCount)}
        onExpand={() => goToRecord(record.id, { tab: 'conversation' })}
      />
      <div
        css={css`
          flex: 1 1 auto;
          min-block-size: 0;
        `}
      >
        <TeamDiscussion record={record} compact />
      </div>
    </Frame>
  );
};
TeamSideChat.displayName = 'TeamSideChat';

/**
 * The compact chat of the side panel: the record's main Agent Builder conversation, or the team
 * discussion when no agent takes part. "Expand" opens the Conversation tab.
 */
export const SideChat: React.FC<SideChatProps> = ({ record, agentAvailable }) => {
  const conversationMode = useConversationMode(record, agentAvailable);

  if (conversationMode.mode === 'team') {
    return <TeamSideChat record={record} />;
  }
  return <AgentSideChat record={record} mainConversationId={conversationMode.conversationId} />;
};
SideChat.displayName = 'SideChat';

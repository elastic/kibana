/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { InvestigationRecord } from '../../../../common/investigations/types';
import { ICONS } from '../../icons';
import type { TabId } from '../tabs/tab_props';
import { EmbeddedChat } from '../conversation/embedded_chat';
import { buildExpandSearch } from '../conversation/side_chat_url';
import { SuggestionChips } from '../conversation/suggestion_chips';
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
  /** The tab the panel sits next to; Expand remembers it so Collapse can return there. */
  activeTab: TabId;
  /** Called by the close button of the embedded chat's header: back to the context cards. */
  onCloseChat: () => void;
}

/** Opens the Conversation tab in place of the side panel's chat. */
const useExpandToConversation = (activeTab: TabId) => {
  const history = useHistory();

  return (threadConversationId?: string) =>
    history.push({
      pathname: history.location.pathname,
      search: buildExpandSearch(activeTab, threadConversationId),
    });
};

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
/** The side panel content has a little padding below the chat. */
const PAGE_BOTTOM_GAP = 16;

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

const AgentSideChat: React.FC<{
  record: InvestigationRecord;
  mainConversationId: string;
  activeTab: TabId;
  onCloseChat: () => void;
}> = ({ record, mainConversationId, activeTab, onCloseChat }) => {
  const { euiTheme } = useEuiTheme();
  const expand = useExpandToConversation(activeTab);
  const { conversationId, thread, select, selectMain } = useSelectedConversation(
    record,
    mainConversationId
  );
  const { messages, conversation } = useConversationMessages(record, conversationId);
  // Bumped after a suggestion chip got an answer, to reload the embedded chat.
  const [chatRevision, setChatRevision] = useState(0);

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
        onExpand={() => expand(thread ? thread.conversation_id : undefined)}
      />
      {thread ? (
        <div
          css={css`
            flex: 0 0 auto;
            padding-block-end: ${euiTheme.size.s};
          `}
        >
          <ThreadBar thread={thread} onBack={selectMain} compact hideTitle />
        </div>
      ) : null}
      <div
        css={css`
          flex: 0 0 auto;
          padding-block-end: ${euiTheme.size.s};
        `}
      >
        <SuggestionChips
          record={record}
          conversationId={conversationId}
          onSent={() => setChatRevision((revision) => revision + 1)}
          compact
        />
      </div>
      <div
        css={css`
          flex: 1 1 auto;
          min-block-size: 0;
          border: ${euiTheme.border.thin};
          border-radius: ${euiTheme.border.radius.medium};
          overflow: hidden;
        `}
      >
        <EmbeddedChat
          key={`${conversationId}-${chatRevision}`}
          record={record}
          conversationId={conversationId}
          onClose={onCloseChat}
        />
      </div>
    </Frame>
  );
};
AgentSideChat.displayName = 'AgentSideChat';

const TeamSideChat: React.FC<{ record: InvestigationRecord; activeTab: TabId }> = ({
  record,
  activeTab,
}) => {
  const expand = useExpandToConversation(activeTab);
  const { messageCount } = useTeamDiscussion(record);

  return (
    <Frame>
      <ChatBar
        countLabel={conversationI18n.TEAM_MESSAGE_COUNT(messageCount)}
        onExpand={() => expand()}
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
export const SideChat: React.FC<SideChatProps> = ({
  record,
  agentAvailable,
  activeTab,
  onCloseChat,
}) => {
  const conversationMode = useConversationMode(record, agentAvailable);

  if (conversationMode.mode === 'team') {
    return <TeamSideChat record={record} activeTab={activeTab} />;
  }
  return (
    <AgentSideChat
      record={record}
      mainConversationId={conversationMode.conversationId}
      activeTab={activeTab}
      onCloseChat={onCloseChat}
    />
  );
};
SideChat.displayName = 'SideChat';

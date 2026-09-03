/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';

import {
  EuiDroppable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiTextTruncate,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { ConversationRoundStatus } from '@kbn/agent-builder-common';
import { appPaths } from '../../../../../utils/app_paths';
import { useStreamingContext } from '../../../../../context/streaming/streaming_context';
import { useConversationList } from '../../../../../hooks/use_conversation_list';
import { useInfiniteScroll } from '../../../../../hooks/use_infinite_scroll';
import {
  createConversationListItemStyles,
  createActiveConversationListItemStyles,
} from '../../../../conversations/conversation_list_item_styles';
import { DROPPABLE_IDS } from './droppable_ids';
import { DraggableConversationItem } from './draggable_conversation_item';

const newConversationLabel = i18n.translate(
  'xpack.agentBuilder.sidebar.conversation.newConversation',
  { defaultMessage: 'New conversation' }
);

interface ConversationListProps {
  agentId: string;
  currentConversationId: string | undefined;
  isNewConversationRoute: boolean;
  onItemClick?: (conversationId: string) => void;
  isDropDisabled?: boolean;
  backgroundColor?: string;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  agentId,
  currentConversationId,
  isNewConversationRoute,
  onItemClick,
  isDropDisabled,
  backgroundColor = 'transparent',
}) => {
  const { euiTheme } = useEuiTheme();
  const {
    conversations = [],
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useConversationList({ agentId, pinned: false });
  const sentinelRef = useInfiniteScroll({ hasNextPage, isFetchingNextPage, fetchNextPage });
  const { activeStreams } = useStreamingContext();

  const sortedConversations = useMemo(
    () =>
      [...conversations].sort((a, b) => {
        const aInProgress =
          activeStreams.has(a.id) || a.status === ConversationRoundStatus.inProgress;
        const bInProgress =
          activeStreams.has(b.id) || b.status === ConversationRoundStatus.inProgress;
        if (aInProgress !== bInProgress) return aInProgress ? -1 : 1;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }),
    [conversations, activeStreams]
  );

  const linkStyles = createConversationListItemStyles(euiTheme);
  const activeLinkStyles = createActiveConversationListItemStyles(euiTheme);

  if (isLoading) {
    return (
      <EuiFlexGroup direction="column" gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="s" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  // If there are no conversations, show 1 mock conversation item that links to the new conversation route
  if (sortedConversations.length === 0) {
    return (
      <EuiDroppable
        droppableId={DROPPABLE_IDS.CHATS}
        spacing="none"
        grow={false}
        isDropDisabled={isDropDisabled}
        css={css`
          background-color: transparent;
        `}
      >
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem grow={false}>
            <Link
              to={appPaths.agent.conversations.new({ agentId })}
              css={isNewConversationRoute ? activeLinkStyles : linkStyles}
              data-test-subj="agentBuilderSidebarConversation-new"
            >
              <EuiTextTruncate text={newConversationLabel} />
            </Link>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiDroppable>
    );
  }

  return (
    <>
      <EuiDroppable
        droppableId={DROPPABLE_IDS.CHATS}
        spacing="none"
        grow={false}
        isDropDisabled={isDropDisabled}
        css={css`
          display: flex;
          flex-direction: column;
          gap: ${euiTheme.size.xs};
          border-radius: ${euiTheme.border.radius.small};
          background-color: ${backgroundColor};
          transition: background-color 0.15s;
        `}
      >
        {sortedConversations.map((conversation, index) => (
          <DraggableConversationItem
            key={conversation.id}
            agentId={agentId}
            conversation={conversation}
            index={index}
            isActive={currentConversationId === conversation.id}
            routeConversationId={currentConversationId}
            onItemClick={onItemClick ? () => onItemClick(conversation.id) : undefined}
          />
        ))}
      </EuiDroppable>

      <div ref={sentinelRef} data-test-subj="agentBuilderSidebarConversationsScrollSentinel" />
      {isFetchingNextPage && (
        <EuiFlexGroup justifyContent="center" gutterSize="none">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="s" />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </>
  );
};

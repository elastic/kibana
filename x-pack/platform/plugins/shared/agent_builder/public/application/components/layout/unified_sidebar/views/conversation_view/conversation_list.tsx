/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom-v5-compat';

import {
  EuiDraggable,
  EuiDroppable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiTextTruncate,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ConversationRoundStatus } from '@kbn/agent-builder-common';
import { appPaths } from '../../../../../utils/app_paths';
import { useStreamingContext } from '../../../../../context/streaming/streaming_context';
import { useConversationList } from '../../../../../hooks/use_conversation_list';
import {
  createConversationListItemStyles,
  createActiveConversationListItemStyles,
} from '../../../../conversations/conversation_list_item_styles';
import { ConversationListItemRow } from './conversation_list_item_row';
import { deriveDisplayStatus } from './derive_display_status';

const newConversationLabel = i18n.translate(
  'xpack.agentBuilder.sidebar.conversation.newConversation',
  { defaultMessage: 'New conversation' }
);

interface ConversationListProps {
  agentId: string;
  currentConversationId: string | undefined;
  isNewConversationRoute: boolean;
  onItemClick?: (conversationId: string) => void;
  pinnedConversationIds?: Set<string>;
  isDropDisabled?: boolean;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  agentId,
  currentConversationId,
  isNewConversationRoute,
  onItemClick,
  pinnedConversationIds,
  isDropDisabled,
}) => {
  const { euiTheme } = useEuiTheme();
  const { conversations = [], isLoading } = useConversationList({ agentId });
  const { activeStreams, byConversationId } = useStreamingContext();

  const sortedConversations = useMemo(
    () =>
      [...conversations]
        .sort((a, b) => {
          const aInProgress =
            activeStreams.has(a.id) || a.status === ConversationRoundStatus.inProgress;
          const bInProgress =
            activeStreams.has(b.id) || b.status === ConversationRoundStatus.inProgress;
          if (aInProgress !== bInProgress) return aInProgress ? -1 : 1;
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        })
        .filter((c) => !pinnedConversationIds?.has(c.id)),
    [conversations, activeStreams, pinnedConversationIds]
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
      <EuiDroppable droppableId="CHATS" spacing="none" grow={false} isDropDisabled={isDropDisabled}>
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
    <EuiDroppable
      droppableId="CHATS"
      spacing="none"
      grow={false}
      isDropDisabled={isDropDisabled}
      style={{ display: 'flex', flexDirection: 'column', gap: euiTheme.size.xs }}
    >
      {sortedConversations.map((conversation, index) => {
        const isActive = currentConversationId === conversation.id;
        const isStreaming = activeStreams.has(conversation.id);
        const hasError = Boolean(byConversationId[conversation.id]?.error);
        const status = deriveDisplayStatus(conversation, isStreaming, hasError, isActive);
        return (
          <EuiDraggable
            key={conversation.id}
            draggableId={conversation.id}
            index={index}
            spacing="none"
          >
            <ConversationListItemRow
              agentId={agentId}
              conversationId={conversation.id}
              title={conversation.title || conversation.id}
              isActive={isActive}
              routeConversationId={currentConversationId}
              showActionsMenu={!isStreaming}
              onItemClick={onItemClick ? () => onItemClick(conversation.id) : undefined}
              status={status}
              read={conversation.read}
            />
          </EuiDraggable>
        );
      })}
    </EuiDroppable>
  );
};

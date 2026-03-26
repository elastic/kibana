/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom-v5-compat';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiTextTruncate,
  useEuiTheme,
} from '@elastic/eui';
import { appPaths } from '../../../../../utils/app_paths';
import { useConversationList } from '../../../../../hooks/use_conversation_list';
import {
  createConversationListItemStyles,
  createActiveConversationListItemStyles,
} from '../../../../conversations/conversation_list_item_styles';
import { NoConversationsPrompt } from '../../../../conversations/embeddable_conversation_header/no_conversations_prompt';

interface ConversationListProps {
  agentId: string;
  currentConversationId: string | undefined;
  onItemClick?: () => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  agentId,
  currentConversationId,
  onItemClick,
}) => {
  const { euiTheme } = useEuiTheme();
  const { conversations = [], isLoading } = useConversationList({ agentId });

  const sortedConversations = useMemo(
    () =>
      [...conversations].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      ),
    [conversations]
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

  if (sortedConversations.length === 0) {
    return <NoConversationsPrompt isFiltered={false} />;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      {sortedConversations.map((conversation) => {
        const isActive = currentConversationId === conversation.id;
        return (
          <EuiFlexItem grow={false} key={conversation.id}>
            <Link
              to={appPaths.agent.conversations.byId({ agentId, conversationId: conversation.id })}
              css={isActive ? activeLinkStyles : linkStyles}
              data-test-subj={`agentBuilderSidebarConversation-${conversation.id}`}
              onClick={onItemClick}
            >
              <EuiTextTruncate text={conversation.title || conversation.id} />
            </Link>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};

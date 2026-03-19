/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Link } from 'react-router-dom-v5-compat';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiTextTruncate,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

import { appPaths } from '../../../../../utils/app_paths';
import { useConversationList } from '../../../../../hooks/use_conversation_list';

interface ConversationListProps {
  agentId: string;
  currentConversationId: string | undefined;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  agentId,
  currentConversationId,
}) => {
  const { euiTheme } = useEuiTheme();
  const { conversations = [], isLoading } = useConversationList({ agentId });

  const sortedConversations = [...conversations].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  const linkStyles = css`
    text-decoration: none;
    padding: 6px ${euiTheme.size.s};
    border-radius: ${euiTheme.border.radius.small};
    color: ${euiTheme.colors.textParagraph};
    font-size: ${euiTheme.font.scale.s}${euiTheme.font.defaultUnits};
    &:hover {
      background-color: ${euiTheme.colors.backgroundLightPrimary};
      color: ${euiTheme.colors.textPrimary};
      text-decoration: none;
    }
  `;

  const activeLinkStyles = css`
    ${linkStyles}
    background-color: ${euiTheme.colors.backgroundLightPrimary};
    color: ${euiTheme.colors.textPrimary};
  `;

  if (isLoading) {
    return (
      <EuiFlexGroup direction="column" gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="s" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
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
            >
              <EuiTextTruncate text={conversation.title || conversation.id} />
            </Link>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};

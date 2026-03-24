/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiTextTruncate,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { useConversationList } from '../../../hooks/use_conversation_list';
import {
  createConversationListItemStyles,
  createActiveConversationListItemStyles,
} from '../conversation_list_item_styles';
import { NoConversationsPrompt } from './no_conversations_prompt';

interface EmbeddableConversationListProps {
  searchValue: string;
  onClose: () => void;
}

export const EmbeddableConversationList: React.FC<EmbeddableConversationListProps> = ({
  searchValue,
  onClose,
}) => {
  const { euiTheme } = useEuiTheme();
  const { agentId, conversationId, setConversationId } = useConversationContext();
  const { conversations = [], isLoading } = useConversationList({ agentId });

  const sortedConversations = useMemo(
    () =>
      [...conversations].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      ),
    [conversations]
  );

  const filteredConversations = useMemo(() => {
    if (!searchValue) return sortedConversations;
    const lower = searchValue.toLowerCase();
    return sortedConversations.filter((c) => c.title.toLowerCase().includes(lower));
  }, [sortedConversations, searchValue]);

  const itemStyles = createConversationListItemStyles(euiTheme);
  const activeItemStyles = createActiveConversationListItemStyles(euiTheme);

  if (isLoading) {
    return (
      <EuiFlexGroup
        justifyContent="center"
        alignItems="center"
        css={css`
          height: 100%;
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="s" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (filteredConversations.length === 0) {
    return <NoConversationsPrompt isFiltered={searchValue.length > 0} />;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      {filteredConversations.map((conversation) => {
        const isActive = conversationId === conversation.id;
        return (
          <EuiFlexItem grow={false} key={conversation.id}>
            <button
              css={isActive ? activeItemStyles : itemStyles}
              onClick={() => {
                setConversationId?.(conversation.id);
                onClose();
              }}
              data-test-subj={`agentBuilderEmbeddableConversation-${conversation.id}`}
            >
              <EuiTextTruncate text={conversation.title || conversation.id} />
            </button>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};

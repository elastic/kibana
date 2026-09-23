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
  EuiIcon,
  EuiLoadingSpinner,
  EuiTextTruncate,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { useStreamingContext } from '../../../context/streaming/streaming_context';
import { useConversationList } from '../../../hooks/use_conversation_list';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { getConversationTemplateIcon } from '../../../hooks/use_conversation_template_display';
import { useInfiniteScroll } from '../../../hooks/use_infinite_scroll';
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
  const { agentId, conversationId, setConversationId, resetAttachments } = useConversationContext();
  const { removeAllErrors } = useStreamingContext();
  const { conversationTemplatesService } = useAgentBuilderServices();
  const {
    conversations = [],
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useConversationList({ agentId });
  const sentinelRef = useInfiniteScroll({ hasNextPage, isFetchingNextPage, fetchNextPage });

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
                removeAllErrors();
                if (!isActive) {
                  resetAttachments?.();
                }
                setConversationId?.(conversation.id);
                onClose();
              }}
              data-test-subj={`agentBuilderEmbeddableConversation-${conversation.id}`}
            >
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon
                    type={getConversationTemplateIcon(
                      conversationTemplatesService,
                      conversation.template_id
                    )}
                    size="s"
                    aria-hidden={true}
                  />
                </EuiFlexItem>
                <EuiFlexItem
                  css={css`
                    min-width: 0;
                  `}
                >
                  <EuiTextTruncate text={conversation.title || conversation.id} />
                </EuiFlexItem>
              </EuiFlexGroup>
            </button>
          </EuiFlexItem>
        );
      })}

      <EuiFlexItem grow={false}>
        <div ref={sentinelRef} data-test-subj="agentBuilderEmbeddableConversationsScrollSentinel" />
      </EuiFlexItem>
      {isFetchingNextPage && (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup justifyContent="center" gutterSize="none">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="s" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

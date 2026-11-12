/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useRef, useState } from 'react';
import {
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useConversationList } from '../../hooks/use_conversation_list';
import { useInfiniteScroll } from '../../hooks/use_infinite_scroll';
import { ConversationSearchResult } from './conversation_search_result';
import { NoConversationsPrompt } from './embeddable_conversation_header/no_conversations_prompt';

const labels = {
  title: i18n.translate('xpack.agentBuilder.conversationSearchModal.title', {
    defaultMessage: 'Search chats',
  }),
  searchPlaceholder: i18n.translate(
    'xpack.agentBuilder.conversationSearchModal.searchPlaceholder',
    { defaultMessage: 'Search by title' }
  ),
  recentChats: i18n.translate('xpack.agentBuilder.conversationSearchModal.recentChats', {
    defaultMessage: 'Recent chats',
  }),
  results: i18n.translate('xpack.agentBuilder.conversationSearchModal.results', {
    defaultMessage: 'Results',
  }),
};

const MODAL_WIDTH = 768;
const LIST_MAX_HEIGHT = 290;

interface ConversationSearchModalProps {
  agentId: string;
  currentConversationId?: string;
  onClose: () => void;
  onSelectConversation: (conversationId: string) => void;
}

export const ConversationSearchModal: React.FC<ConversationSearchModalProps> = ({
  agentId,
  currentConversationId,
  onClose,
  onSelectConversation,
}) => {
  const [searchValue, setSearchValue] = useState('');

  const { euiTheme } = useEuiTheme();
  const modalTitleId = useGeneratedHtmlId();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Consume both the pinned and unpinned caches — opening the modal costs no
  // extra network request since ConversationList and PinnedConversationList
  // have already populated these keys in the sidebar. This is the default
  // (empty-query) view only; a non-empty query switches to server-side search
  // below the caches would otherwise be scoped to whatever pages are cached.
  const { conversations: unpinnedConversations = [], isLoading: isLoadingUnpinned } =
    useConversationList({ agentId, pinned: false });
  const { conversations: pinnedConversations = [], isLoading: isLoadingPinned } =
    useConversationList({ agentId, pinned: true });
  const isLoadingCached = isLoadingUnpinned || isLoadingPinned;

  // Debounces internally and only issues a search request once `searchValue` is non-empty,
  // so the empty-query view above keeps its zero-extra-request property.
  const {
    conversations: searchResults,
    isLoading: isSearchLoading,
    isSearching,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useConversationList({ agentId, query: searchValue });
  const sentinelRef = useInfiniteScroll({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    scrollContainerRef,
  });

  const sortedConversations = useMemo(
    () =>
      [...pinnedConversations, ...unpinnedConversations].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      ),
    [pinnedConversations, unpinnedConversations]
  );

  const conversations = isSearching ? searchResults : sortedConversations;
  const isLoading = isSearching ? isSearchLoading : isLoadingCached;

  const listStyles = css`
    overflow-y: auto;
    max-height: ${LIST_MAX_HEIGHT}px;
    margin-top: ${euiTheme.size.m};
  `;

  const headingStyles = css`
    padding: ${euiTheme.size.xs} 0;
  `;

  const renderList = () => {
    if (isLoading) {
      return (
        <EuiFlexGroup justifyContent="center" alignItems="center" gutterSize="none">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="s" />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    if (conversations.length === 0) {
      return <NoConversationsPrompt isFiltered={isSearching} />;
    }

    return (
      <>
        <EuiText
          size="xs"
          color="subdued"
          css={headingStyles}
          data-test-subj="agentBuilderConversationSearchListHeading"
        >
          {isSearching ? labels.results : labels.recentChats}
        </EuiText>
        <EuiFlexGroup direction="column" gutterSize="xs">
          {conversations.map((conversation) => (
            <EuiFlexItem grow={false} key={conversation.id}>
              <ConversationSearchResult
                conversation={conversation}
                isActive={currentConversationId === conversation.id}
                onSelect={(conversationId) => {
                  onSelectConversation(conversationId);
                  onClose();
                }}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
        {isSearching && (
          <>
            <div ref={sentinelRef} data-test-subj="agentBuilderConversationSearchScrollSentinel" />
            {isFetchingNextPage && (
              <EuiFlexGroup justifyContent="center" gutterSize="none">
                <EuiFlexItem grow={false}>
                  <EuiLoadingSpinner size="s" />
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          </>
        )}
      </>
    );
  };

  return (
    <EuiModal
      aria-labelledby={modalTitleId}
      onClose={onClose}
      outsideClickCloses={true}
      style={{ width: MODAL_WIDTH }}
      data-test-subj="agentBuilderConversationSearchModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>{labels.title}</EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiFieldSearch
          fullWidth
          autoFocus
          placeholder={labels.searchPlaceholder}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          data-test-subj="agentBuilderConversationSearchInput"
        />

        <div ref={scrollContainerRef} css={listStyles}>
          {renderList()}
        </div>
      </EuiModalBody>
    </EuiModal>
  );
};

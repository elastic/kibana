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
  EuiTextTruncate,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { getEbtProps } from '@kbn/ebt-click';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { useConversationList } from '../../hooks/use_conversation_list';
import { useConversationSearch } from '../../hooks/use_conversation_search';
import { useInfiniteScroll } from '../../hooks/use_infinite_scroll';
import {
  createActiveConversationListItemStyles,
  createConversationListItemStyles,
} from './conversation_list_item_styles';
import { NoConversationsPrompt } from './embeddable_conversation_header/no_conversations_prompt';

const labels = {
  title: i18n.translate('xpack.agentBuilder.conversationSearchModal.title', {
    defaultMessage: 'Search chats',
  }),
  searchPlaceholder: i18n.translate(
    'xpack.agentBuilder.conversationSearchModal.searchPlaceholder',
    { defaultMessage: 'Search chats' }
  ),
};

const MODAL_WIDTH = 480;
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
  const isSearching = searchValue.trim().length > 0;

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

  // Debounces internally and only issues a request once `searchValue` is non-empty,
  // so the empty-query view above keeps its zero-extra-request property.
  const {
    conversations: searchResults,
    isLoading: isSearchLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useConversationSearch({ agentId, query: searchValue });
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

  const itemStyles = createConversationListItemStyles(euiTheme);
  const activeItemStyles = createActiveConversationListItemStyles(euiTheme);

  const listStyles = css`
    overflow-y: auto;
    max-height: ${LIST_MAX_HEIGHT}px;
    margin-top: ${euiTheme.size.m};
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
        <EuiFlexGroup direction="column" gutterSize="xs">
          {conversations.map((conversation) => {
            const isActive = currentConversationId === conversation.id;
            return (
              <EuiFlexItem grow={false} key={conversation.id}>
                <button
                  css={isActive ? activeItemStyles : itemStyles}
                  onClick={() => {
                    onSelectConversation(conversation.id);
                    onClose();
                  }}
                  data-test-subj={`agentBuilderConversationSearchResult-${conversation.id}`}
                  {...getEbtProps({
                    element: AGENT_BUILDER_UI_EBT.element.sidebar,
                    action: AGENT_BUILDER_UI_EBT.action.conversationList.CONVERSATION_RESUME,
                  })}
                >
                  <EuiTextTruncate text={conversation.title || conversation.id} />
                </button>
              </EuiFlexItem>
            );
          })}
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

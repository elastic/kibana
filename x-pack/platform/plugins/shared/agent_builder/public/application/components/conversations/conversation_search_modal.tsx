/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
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
import { useConversationList } from '../../hooks/use_conversation_list';
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

  const { euiTheme } = useEuiTheme();
  const modalTitleId = useGeneratedHtmlId();

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

    if (filteredConversations.length === 0) {
      return <NoConversationsPrompt isFiltered={searchValue.length > 0} />;
    }

    return (
      <EuiFlexGroup direction="column" gutterSize="xs">
        {filteredConversations.map((conversation) => {
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
              >
                <EuiTextTruncate text={conversation.title || conversation.id} />
              </button>
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
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

        <div css={listStyles}>{renderList()}</div>
      </EuiModalBody>
    </EuiModal>
  );
};

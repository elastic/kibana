/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSelect,
  EuiSpacer,
  EuiTablePagination,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { CaseUI } from '../../../../common/ui/types';
import { getConversationAttachmentIds } from './helpers';
import { ConversationRow } from './conversation_row';
import { useAgentBuilderAgents } from './use_agent_builder_agents';
import { useAttachConversation } from './use_attach_conversation';
import { useFindConversations, type FoundConversation } from './use_find_conversations';
import * as i18n from './translations';

const DEFAULT_PAGE_SIZE = 10;
const PER_PAGE_OPTIONS = [10, 25, 50];
const ALL_AGENTS = 'all';
const MODAL_CSS = { inlineSize: 800 } as const;
const RESULTS_REGION_CSS = {
  blockSize: 480,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
} as const;
const CENTERED_CSS = { margin: 'auto' } as const;

export interface AttachConversationModalProps {
  caseData: CaseUI;
  onClose: () => void;
}

export const AttachConversationModal: React.FC<AttachConversationModalProps> = ({
  caseData,
  onClose,
}) => {
  const modalTitleId = useGeneratedHtmlId();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [agentId, setAgentId] = useState(ALL_AGENTS);
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [attachedIds, setAttachedIds] = useState<Set<string>>(
    () => new Set(getConversationAttachmentIds(caseData.comments))
  );

  useDebounce(() => setDebouncedQuery(query.trim()), 250, [query]);

  const { agents, nameById } = useAgentBuilderAgents();
  const { items, pageCount, isLoading, isError, refetch } = useFindConversations({
    query: debouncedQuery,
    agentId: agentId === ALL_AGENTS ? undefined : agentId,
    page,
    perPage,
  });
  const { attach, attachingId, isAttaching } = useAttachConversation({
    caseId: caseData.id,
    caseOwner: caseData.owner,
  });

  const agentOptions = useMemo(
    () => [
      { value: ALL_AGENTS, text: i18n.FILTER_ALL_AGENTS },
      ...agents.map((agent) => ({ value: agent.id, text: agent.name })),
    ],
    [agents]
  );

  const handleAttach = useCallback(
    async (conversation: FoundConversation) => {
      try {
        await attach(conversation);
      } catch {
        return;
      }
      setAttachedIds((prev) => new Set(prev).add(conversation.id));
    },
    [attach]
  );

  const onQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setPage(0);
  }, []);

  const onAgentChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setAgentId(e.target.value);
    setPage(0);
  }, []);

  const onPerPageChange = useCallback((next: number) => {
    setPerPage(next);
    setPage(0);
  }, []);

  const isFiltered = debouncedQuery.length > 0 || agentId !== ALL_AGENTS;

  const renderResults = () => {
    if (isLoading) {
      return (
        <EuiFlexGroup
          justifyContent="center"
          alignItems="center"
          css={{ blockSize: '100%' }}
          data-test-subj="cases-attach-conversation-loading"
        >
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }
    if (isError) {
      return (
        <EuiEmptyPrompt
          color="danger"
          iconType="error"
          titleSize="xs"
          title={<h3>{i18n.FETCH_ERROR_TITLE}</h3>}
          body={<p>{i18n.FETCH_ERROR_BODY}</p>}
          actions={
            <EuiButton onClick={() => refetch()} data-test-subj="cases-attach-conversation-retry">
              {i18n.TRY_AGAIN}
            </EuiButton>
          }
          css={CENTERED_CSS}
          data-test-subj="cases-attach-conversation-error"
        />
      );
    }
    if (items.length === 0) {
      return (
        <EuiEmptyPrompt
          iconType={isFiltered ? 'magnify' : 'productAgent'}
          titleSize="xs"
          title={<h3>{isFiltered ? i18n.NO_RESULTS_TITLE : i18n.EMPTY_TITLE}</h3>}
          body={<p>{isFiltered ? i18n.NO_RESULTS_BODY : i18n.EMPTY_BODY}</p>}
          css={CENTERED_CSS}
          data-test-subj="cases-attach-conversation-empty"
        />
      );
    }
    return (
      <EuiFlexGroup
        direction="column"
        gutterSize="s"
        aria-label={i18n.CONVERSATION_LIST_LABEL}
        data-test-subj="cases-attach-conversation-list"
      >
        {items.map((conversation) => (
          <EuiFlexItem key={conversation.id} grow={false}>
            <ConversationRow
              conversation={conversation}
              agentName={nameById.get(conversation.agent_id) ?? conversation.agent_id}
              isAttached={attachedIds.has(conversation.id)}
              isAttachInFlight={attachingId === conversation.id}
              isAttachingAny={isAttaching}
              onAttach={handleAttach}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    );
  };

  return (
    <EuiModal
      onClose={onClose}
      css={MODAL_CSS}
      aria-labelledby={modalTitleId}
      data-test-subj="cases-attach-conversation-modal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>{i18n.MODAL_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFlexGroup gutterSize="s" responsive={false}>
          <EuiFlexItem>
            <EuiFieldSearch
              fullWidth
              autoFocus
              placeholder={i18n.SEARCH_PLACEHOLDER}
              value={query}
              onChange={onQueryChange}
              isClearable
              data-test-subj="cases-attach-conversation-search"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSelect
              options={agentOptions}
              value={agentId}
              onChange={onAgentChange}
              aria-label={i18n.FILTER_AGENT_LABEL}
              data-test-subj="cases-attach-conversation-agent-select"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xs" />
        <EuiText size="xs" color="subdued">
          {i18n.ACCESS_NOTE}
        </EuiText>
        <EuiSpacer size="m" />
        <div css={RESULTS_REGION_CSS} data-test-subj="cases-attach-conversation-results">
          {renderResults()}
        </div>
        <EuiSpacer size="m" />
        <EuiTablePagination
          activePage={page}
          pageCount={pageCount}
          itemsPerPage={perPage}
          itemsPerPageOptions={PER_PAGE_OPTIONS}
          onChangePage={setPage}
          onChangeItemsPerPage={onPerPageChange}
          data-test-subj="cases-attach-conversation-pagination"
        />
      </EuiModalBody>
    </EuiModal>
  );
};

AttachConversationModal.displayName = 'AttachConversationModal';

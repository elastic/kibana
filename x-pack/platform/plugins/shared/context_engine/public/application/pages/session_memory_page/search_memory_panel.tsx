/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonGroup,
  EuiCheckboxGroup,
  EuiEmptyPrompt,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState } from 'react';
import {
  DEFAULT_SESSION_MEMORY_SEARCH_SIZE,
  MAX_SESSION_MEMORY_SEARCH_SIZE,
} from '../../../../common/constants';
import type {
  SearchSessionMemoryBody,
  SessionMemoryMediaItem,
} from '../../../../common/http_api/session_memory';
import { useSearchSessionMemory } from '../../hooks/use_session_memory_mutations';
import { IMAGE_FILE_ACCEPT } from './media_file';
import { MediaFilePicker } from './media_file_picker';
import { useSessionContext } from './session_context';
import type { SessionContextValue } from './session_context';
import { PanelHeader } from './panel_header';
import { SessionMemoryCard } from './session_memory_card';

type QueryMode = 'text' | 'image';

/** Which parts of the session context narrow the search. */
export type SearchFilterKey = 'user' | 'session' | 'agent' | 'aiIndex';
export type SearchFilters = Record<SearchFilterKey, boolean>;

export const DEFAULT_SEARCH_FILTERS: SearchFilters = {
  user: true,
  session: false,
  agent: false,
  aiIndex: false,
};

const labels = {
  queryMode: i18n.translate('xpack.contextEngine.sessionMemory.search.queryMode', {
    defaultMessage: 'Query',
  }),
  textMode: i18n.translate('xpack.contextEngine.sessionMemory.search.textMode', {
    defaultMessage: 'Text',
  }),
  imageMode: i18n.translate('xpack.contextEngine.sessionMemory.search.imageMode', {
    defaultMessage: 'Image',
  }),
  text: i18n.translate('xpack.contextEngine.sessionMemory.search.text', {
    defaultMessage: 'Search text',
  }),
  textPlaceholder: i18n.translate('xpack.contextEngine.sessionMemory.search.textPlaceholder', {
    defaultMessage: 'e.g. what does the user prefer?',
  }),
  image: i18n.translate('xpack.contextEngine.sessionMemory.search.image', {
    defaultMessage: 'Search image',
  }),
  imageHelp: i18n.translate('xpack.contextEngine.sessionMemory.search.imageHelp', {
    defaultMessage: 'PNG, JPEG, WebP, or GIF under 1 MB.',
  }),
  filters: i18n.translate('xpack.contextEngine.sessionMemory.search.filters', {
    defaultMessage: 'Only memories from',
  }),
  filterUser: i18n.translate('xpack.contextEngine.sessionMemory.search.filterUser', {
    defaultMessage: 'this user',
  }),
  filterSession: i18n.translate('xpack.contextEngine.sessionMemory.search.filterSession', {
    defaultMessage: 'this session',
  }),
  filterAgent: i18n.translate('xpack.contextEngine.sessionMemory.search.filterAgent', {
    defaultMessage: 'this agent',
  }),
  filterAiIndex: i18n.translate('xpack.contextEngine.sessionMemory.search.filterAiIndex', {
    defaultMessage: 'this AI index',
  }),
  filterAiIndexMany: i18n.translate('xpack.contextEngine.sessionMemory.search.filterAiIndexMany', {
    defaultMessage: 'this AI index (select a single index to filter)',
  }),
  size: i18n.translate('xpack.contextEngine.sessionMemory.search.size', {
    defaultMessage: 'Size',
  }),
  submit: i18n.translate('xpack.contextEngine.sessionMemory.search.submit', {
    defaultMessage: 'Search',
  }),
};

export const buildSearchBody = (
  { sessionId, userId, agentId, spaceId, aiIndexIds }: SessionContextValue,
  filters: SearchFilters,
  query: string | SessionMemoryMediaItem,
  size: number
): SearchSessionMemoryBody => ({
  query,
  ...(filters.session && sessionId.trim() ? { session_id: sessionId.trim() } : {}),
  ...(filters.user && userId ? { user_id: userId } : {}),
  ...(filters.agent && agentId.trim() ? { agent_id: agentId.trim() } : {}),
  ...(spaceId ? { space: spaceId } : {}),
  // The search API filters on a single AI index, so the filter only applies to a lone selection.
  ...(filters.aiIndex && aiIndexIds.length === 1 ? { ai_index_id: aiIndexIds[0] } : {}),
  size,
});

export const SearchMemoryPanel = () => {
  const session = useSessionContext();
  const [mode, setMode] = useState<QueryMode>('text');
  const [text, setText] = useState('');
  const [image, setImage] = useState<SessionMemoryMediaItem | undefined>();
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_SEARCH_FILTERS);
  const [size, setSize] = useState(DEFAULT_SESSION_MEMORY_SEARCH_SIZE);
  const { mutate, isLoading, data } = useSearchSessionMemory();

  const query = mode === 'text' ? text.trim() : image;
  const maxScore = data ? Math.max(0, ...data.results.map((hit) => hit._score)) : 0;
  const canSubmit = Boolean(query) && size >= 1 && size <= MAX_SESSION_MEMORY_SEARCH_SIZE;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!query || !canSubmit) {
      return;
    }
    mutate(buildSearchBody(session, filters, query, size));
  };

  const filterOptions = [
    {
      id: 'user',
      label: labels.filterUser,
      'data-test-subj': 'contextSessionMemorySearch-filter-user',
    },
    {
      id: 'session',
      label: labels.filterSession,
      'data-test-subj': 'contextSessionMemorySearch-filter-session',
    },
    {
      id: 'agent',
      label: labels.filterAgent,
      'data-test-subj': 'contextSessionMemorySearch-filter-agent',
    },
    {
      id: 'aiIndex',
      label: session.aiIndexIds.length > 1 ? labels.filterAiIndexMany : labels.filterAiIndex,
      disabled: session.aiIndexIds.length !== 1,
      'data-test-subj': 'contextSessionMemorySearch-filter-aiIndex',
    },
  ];

  return (
    <EuiPanel hasBorder paddingSize="l" data-test-subj="contextSessionMemorySearchPanel">
      <PanelHeader
        iconType="magnify"
        title={
          <FormattedMessage
            id="xpack.contextEngine.sessionMemory.search.title"
            defaultMessage="Search"
          />
        }
        description={
          <FormattedMessage
            id="xpack.contextEngine.sessionMemory.search.description"
            defaultMessage="Find memories by meaning with free text or an image. Filters narrow the candidates before the vector search."
          />
        }
      />
      <EuiForm component="form" onSubmit={submit}>
        <EuiFormRow label={labels.queryMode} fullWidth>
          <EuiButtonGroup
            legend={labels.queryMode}
            buttonSize="compressed"
            idSelected={mode}
            onChange={(id) => setMode(id as QueryMode)}
            options={[
              {
                id: 'text',
                label: labels.textMode,
                'data-test-subj': 'contextSessionMemorySearch-mode-text',
              },
              {
                id: 'image',
                label: labels.imageMode,
                'data-test-subj': 'contextSessionMemorySearch-mode-image',
              },
            ]}
            isDisabled={isLoading}
          />
        </EuiFormRow>
        {mode === 'text' ? (
          <EuiFormRow label={labels.text} fullWidth>
            <EuiFieldText
              fullWidth
              compressed
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={labels.textPlaceholder}
              disabled={isLoading}
              data-test-subj="contextSessionMemorySearch-text"
              aria-label={labels.text}
            />
          </EuiFormRow>
        ) : (
          <MediaFilePicker
            label={labels.image}
            helpText={labels.imageHelp}
            accept={IMAGE_FILE_ACCEPT}
            onChange={setImage}
            isDisabled={isLoading}
            data-test-subj="contextSessionMemorySearch-image"
          />
        )}
        <EuiFormRow label={labels.filters} fullWidth>
          <EuiCheckboxGroup
            compressed
            options={filterOptions}
            idToSelectedMap={filters}
            onChange={(id) =>
              setFilters((current) => ({
                ...current,
                [id]: !current[id as SearchFilterKey],
              }))
            }
            disabled={isLoading}
          />
        </EuiFormRow>
        <EuiFlexGroup gutterSize="s" alignItems="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiFormRow label={labels.size}>
              <EuiFieldNumber
                compressed
                min={1}
                max={MAX_SESSION_MEMORY_SEARCH_SIZE}
                value={size}
                onChange={(event) => setSize(Number(event.target.value))}
                disabled={isLoading}
                data-test-subj="contextSessionMemorySearch-size"
                aria-label={labels.size}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFormRow hasEmptyLabelSpace>
              <EuiButton
                type="submit"
                fill
                isLoading={isLoading}
                isDisabled={!canSubmit}
                data-test-subj="contextSessionMemorySearch-submit"
              >
                {labels.submit}
              </EuiButton>
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiForm>
      {data && (
        <>
          <EuiSpacer size="m" />
          {data.results.length === 0 ? (
            <EuiEmptyPrompt
              iconType="magnify"
              titleSize="xs"
              title={
                <h3>
                  <FormattedMessage
                    id="xpack.contextEngine.sessionMemory.search.noResults"
                    defaultMessage="No matching memories"
                  />
                </h3>
              }
              data-test-subj="contextSessionMemorySearch-empty"
            />
          ) : (
            <>
              <EuiText size="s" color="subdued" data-test-subj="contextSessionMemorySearch-count">
                <FormattedMessage
                  id="xpack.contextEngine.sessionMemory.search.resultCount"
                  defaultMessage="{count, plural, one {# match} other {# matches}}, best first"
                  values={{ count: data.results.length }}
                />
              </EuiText>
              <EuiSpacer size="s" />
              <EuiFlexGroup
                direction="column"
                gutterSize="s"
                data-test-subj="contextSessionMemorySearch-results"
              >
                {data.results.map((hit) => (
                  <EuiFlexItem key={hit.memory.id}>
                    <SessionMemoryCard
                      memory={hit.memory}
                      score={hit._score}
                      maxScore={maxScore}
                      data-test-subj="contextSessionMemoryResult"
                    />
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </>
          )}
        </>
      )}
    </EuiPanel>
  );
};

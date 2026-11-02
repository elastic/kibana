/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonGroup,
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
  EuiTitle,
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
import { SessionMemoryResult } from './session_memory_result';
import { EMPTY_SESSION_SCOPE, SessionScopeFields } from './session_scope_fields';
import type { SessionScope } from './session_scope_fields';

type QueryMode = 'text' | 'image';

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
  size: i18n.translate('xpack.contextEngine.sessionMemory.search.size', {
    defaultMessage: 'Size',
  }),
  submit: i18n.translate('xpack.contextEngine.sessionMemory.search.submit', {
    defaultMessage: 'Search',
  }),
};

export const buildSearchBody = (
  scope: SessionScope,
  query: string | SessionMemoryMediaItem,
  size: number
): SearchSessionMemoryBody => ({
  query,
  ...(scope.sessionId.trim() ? { session_id: scope.sessionId.trim() } : {}),
  ...(scope.userId.trim() ? { user_id: scope.userId.trim() } : {}),
  ...(scope.agentId.trim() ? { agent_id: scope.agentId.trim() } : {}),
  ...(scope.space.trim() ? { space: scope.space.trim() } : {}),
  ...(scope.aiIndexIds[0] ? { ai_index_id: scope.aiIndexIds[0] } : {}),
  size,
});

export const SearchMemoryPanel = () => {
  const [scope, setScope] = useState<SessionScope>(EMPTY_SESSION_SCOPE);
  const [mode, setMode] = useState<QueryMode>('text');
  const [text, setText] = useState('');
  const [image, setImage] = useState<SessionMemoryMediaItem | undefined>();
  const [size, setSize] = useState(DEFAULT_SESSION_MEMORY_SEARCH_SIZE);
  const { mutate, isLoading, data } = useSearchSessionMemory();

  const query = mode === 'text' ? text.trim() : image;
  const canSubmit = Boolean(query) && size >= 1 && size <= MAX_SESSION_MEMORY_SEARCH_SIZE;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!query || !canSubmit) {
      return;
    }
    mutate(buildSearchBody(scope, query, size));
  };

  return (
    <EuiPanel hasBorder paddingSize="l" data-test-subj="contextSessionMemorySearchPanel">
      <EuiTitle size="s">
        <h2>
          <FormattedMessage
            id="xpack.contextEngine.sessionMemory.search.title"
            defaultMessage="Search"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText size="s" color="subdued">
        <p>
          <FormattedMessage
            id="xpack.contextEngine.sessionMemory.search.description"
            defaultMessage="Find memories by meaning with free text or an image. Filters narrow the candidates before the vector search."
          />
        </p>
      </EuiText>
      <EuiSpacer size="m" />
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
        <SessionScopeFields
          value={scope}
          onChange={setScope}
          required={false}
          singleAiIndexId
          isDisabled={isLoading}
          data-test-subj="contextSessionMemorySearch"
        />
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
            <EuiFlexGroup
              direction="column"
              gutterSize="s"
              data-test-subj="contextSessionMemorySearch-results"
            >
              {data.results.map((hit) => (
                <EuiFlexItem key={hit.memory.id}>
                  <SessionMemoryResult hit={hit} />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          )}
        </>
      )}
    </EuiPanel>
  );
};

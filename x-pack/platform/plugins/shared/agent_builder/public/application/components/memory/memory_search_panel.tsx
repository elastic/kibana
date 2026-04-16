/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import {
  EuiBasicTable,
  EuiButton,
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { i18n } from '@kbn/i18n';
import type { MemoryNode, RetrievalStage } from '@kbn/agent-builder-common';
import { MemoryTypeBadge, MemoryStatusBadge } from './memory_type_badge';
import { MemoryDetailFlyout } from './memory_detail_flyout';
import { useMemorySearch } from '../../hooks/memory/use_memory_search';

const STAGE_OPTIONS: Array<{ value: RetrievalStage | ''; text: string }> = [
  {
    value: 'round_start',
    text: i18n.translate('xpack.agentBuilder.memory.search.stage.roundStart', {
      defaultMessage: 'Round start',
    }),
  },
  {
    value: 'tool_checkpoint',
    text: i18n.translate('xpack.agentBuilder.memory.search.stage.toolCheckpoint', {
      defaultMessage: 'Tool checkpoint',
    }),
  },
  {
    value: 'final_answer',
    text: i18n.translate('xpack.agentBuilder.memory.search.stage.finalAnswer', {
      defaultMessage: 'Final answer',
    }),
  },
  {
    value: 'memory_expand',
    text: i18n.translate('xpack.agentBuilder.memory.search.stage.memoryExpand', {
      defaultMessage: 'Memory expand',
    }),
  },
];

export const AgentBuilderMemorySearchPanel: React.FC = () => {
  const [query, setQuery] = useState('');
  const [stage, setStage] = useState<RetrievalStage>('round_start');
  const [limit] = useState(10);
  const [selectedMemoryId, setSelectedMemoryId] = useState<string | undefined>(undefined);

  const { search, results, total, lastQuery, lastStage, isLoading } = useMemorySearch();

  const handleSearch = useCallback(() => {
    if (!query.trim()) return;
    search({ query: query.trim(), stage, limit });
  }, [query, stage, limit, search]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSearch();
      }
    },
    [handleSearch]
  );

  const columns = [
    {
      field: 'summary',
      name: i18n.translate('xpack.agentBuilder.memory.search.column.summary', {
        defaultMessage: 'Summary',
      }),
      render: (summary: string, memory: MemoryNode) => (
        <EuiText
          size="s"
          style={{ cursor: 'pointer' }}
          onClick={() => setSelectedMemoryId(memory.id)}
          data-test-subj={`agentBuilderMemorySearchRowSummary-${memory.id}`}
        >
          {summary}
        </EuiText>
      ),
    },
    {
      field: 'type',
      name: i18n.translate('xpack.agentBuilder.memory.search.column.type', {
        defaultMessage: 'Type',
      }),
      width: '110px',
      render: (type: MemoryNode['type']) => <MemoryTypeBadge type={type} />,
    },
    {
      field: 'status',
      name: i18n.translate('xpack.agentBuilder.memory.search.column.status', {
        defaultMessage: 'Status',
      }),
      width: '120px',
      render: (status: MemoryNode['status']) => <MemoryStatusBadge status={status} />,
    },
    {
      field: 'confidence',
      name: i18n.translate('xpack.agentBuilder.memory.search.column.confidence', {
        defaultMessage: 'Confidence',
      }),
      width: '100px',
      render: (confidence: number) => confidence?.toFixed(2),
    },
  ];

  return (
    <>
      <KibanaPageTemplate data-test-subj="agentBuilderMemorySearchPage">
        <KibanaPageTemplate.Header
          pageTitle={i18n.translate('xpack.agentBuilder.memory.search.pageTitle', {
            defaultMessage: 'Memory Search / Debug',
          })}
          description={i18n.translate('xpack.agentBuilder.memory.search.pageDescription', {
            defaultMessage:
              'Search memories using the same retrieval logic as the agent. Useful for debugging retrieval quality.',
          })}
          css={({ euiTheme }: { euiTheme: { colors: { backgroundBasePlain: string } } }) => ({
            backgroundColor: euiTheme.colors.backgroundBasePlain,
            borderBlockEnd: 'none',
          })}
        />
        <KibanaPageTemplate.Section>
          <EuiForm component="form">
            <EuiFlexGroup alignItems="flexEnd" wrap gutterSize="m">
              <EuiFlexItem grow={4}>
                <EuiFormRow
                  label={i18n.translate('xpack.agentBuilder.memory.search.form.queryLabel', {
                    defaultMessage: 'Search query',
                  })}
                  fullWidth
                >
                  <EuiFieldText
                    placeholder={i18n.translate(
                      'xpack.agentBuilder.memory.search.form.queryPlaceholder',
                      { defaultMessage: 'Enter search query...' }
                    )}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    fullWidth
                    data-test-subj="agentBuilderMemorySearchQuery"
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={1}>
                <EuiFormRow
                  label={i18n.translate('xpack.agentBuilder.memory.search.form.stageLabel', {
                    defaultMessage: 'Stage',
                  })}
                >
                  <EuiSelect
                    options={STAGE_OPTIONS}
                    value={stage}
                    onChange={(e) => setStage(e.target.value as RetrievalStage)}
                    data-test-subj="agentBuilderMemorySearchStage"
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFormRow hasEmptyLabelSpace>
                  <EuiButton
                    fill
                    onClick={handleSearch}
                    isLoading={isLoading}
                    disabled={!query.trim()}
                    iconType="search"
                    data-test-subj="agentBuilderMemorySearchButton"
                  >
                    {i18n.translate('xpack.agentBuilder.memory.search.form.searchButton', {
                      defaultMessage: 'Search',
                    })}
                  </EuiButton>
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiForm>

          <EuiSpacer size="l" />

          {isLoading && (
            <EuiFlexGroup justifyContent="center">
              <EuiLoadingSpinner size="l" />
            </EuiFlexGroup>
          )}

          {!isLoading && lastQuery && (
            <>
              <EuiCallOut
                title={i18n.translate('xpack.agentBuilder.memory.search.results.summary', {
                  defaultMessage:
                    'Found {total} {total, plural, one {result} other {results}} for "{query}" at stage "{stage}"',
                  values: { total, query: lastQuery, stage: lastStage },
                })}
                color="primary"
                iconType="search"
                size="s"
                data-test-subj="agentBuilderMemorySearchResultsSummary"
              />
              <EuiSpacer size="m" />
              {results.length > 0 ? (
                <EuiBasicTable
                  tableCaption={i18n.translate(
                    'xpack.agentBuilder.memory.search.results.tableCaption',
                    { defaultMessage: 'Search results' }
                  )}
                  items={results}
                  itemId="id"
                  columns={columns}
                  rowProps={(memory) => ({
                    'data-test-subj': `agentBuilderMemorySearchRow-${memory.id}`,
                    style: { cursor: 'pointer' },
                    onClick: () => setSelectedMemoryId(memory.id),
                  })}
                  data-test-subj="agentBuilderMemorySearchResultsTable"
                />
              ) : (
                <EuiText color="subdued" textAlign="center">
                  {i18n.translate('xpack.agentBuilder.memory.search.results.noResults', {
                    defaultMessage: 'No memories matched the search query.',
                  })}
                </EuiText>
              )}
            </>
          )}
        </KibanaPageTemplate.Section>
      </KibanaPageTemplate>

      {selectedMemoryId && (
        <MemoryDetailFlyout
          memoryId={selectedMemoryId}
          onClose={() => setSelectedMemoryId(undefined)}
          onOpenMemory={setSelectedMemoryId}
        />
      )}
    </>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiPageHeader,
  EuiPageSection,
  EuiBasicTable,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiCallOut,
  EuiCodeBlock,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Suggestion } from '../../../common/types';

const statusColors: Record<string, string> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  superseded: 'default',
};

const actionLabels: Record<string, string> = {
  create: 'Create',
  update: 'Update',
  delete: 'Delete',
};

export const SuggestionsPage = () => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/knowledge_mining/suggestions?status=pending');
      const data = await response.json();
      setSuggestions(data.results);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  const handleApprove = async (id: string) => {
    await fetch(`/api/knowledge_mining/suggestions/${id}/approve`, { method: 'POST' });
    fetchSuggestions();
  };

  const handleReject = async (id: string) => {
    await fetch(`/api/knowledge_mining/suggestions/${id}/reject`, { method: 'POST' });
    fetchSuggestions();
  };

  const handleBulkApprove = async () => {
    await fetch('/api/knowledge_mining/suggestions/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: selectedIds, action: 'approve' }),
    });
    setSelectedIds([]);
    fetchSuggestions();
  };

  const handleBulkReject = async () => {
    await fetch('/api/knowledge_mining/suggestions/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: selectedIds, action: 'reject' }),
    });
    setSelectedIds([]);
    fetchSuggestions();
  };

  const columns = [
    {
      field: 'action',
      name: i18n.translate('xpack.knowledgeMining.suggestions.actionColumn', {
        defaultMessage: 'Action',
      }),
      render: (action: string) => <EuiBadge>{actionLabels[action] ?? action}</EuiBadge>,
      width: '100px',
    },
    {
      field: 'proposed_path',
      name: i18n.translate('xpack.knowledgeMining.suggestions.pathColumn', {
        defaultMessage: 'Path',
      }),
    },
    {
      field: 'proposed_title',
      name: i18n.translate('xpack.knowledgeMining.suggestions.titleColumn', {
        defaultMessage: 'Title',
      }),
    },
    {
      field: 'status',
      name: i18n.translate('xpack.knowledgeMining.suggestions.statusColumn', {
        defaultMessage: 'Status',
      }),
      render: (status: string) => (
        <EuiBadge color={statusColors[status] ?? 'default'}>{status}</EuiBadge>
      ),
      width: '120px',
    },
    {
      field: 'created_at',
      name: i18n.translate('xpack.knowledgeMining.suggestions.createdColumn', {
        defaultMessage: 'Created',
      }),
      render: (date: string) => new Date(date).toLocaleString(),
      width: '180px',
    },
    {
      name: i18n.translate('xpack.knowledgeMining.suggestions.actionsColumn', {
        defaultMessage: 'Actions',
      }),
      width: '200px',
      render: (item: Suggestion) =>
        item.status === 'pending' ? (
          <EuiFlexGroup gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButton size="s" color="success" onClick={() => handleApprove(item.id)}>
                {i18n.translate('xpack.knowledgeMining.suggestions.approve', {
                  defaultMessage: 'Approve',
                })}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty size="s" color="danger" onClick={() => handleReject(item.id)}>
                {i18n.translate('xpack.knowledgeMining.suggestions.reject', {
                  defaultMessage: 'Reject',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : null,
    },
  ];

  const itemIdToExpandedRowMap: Record<string, React.ReactNode> = {};
  if (expandedId) {
    const suggestion = suggestions.find((s) => s.id === expandedId);
    if (suggestion) {
      itemIdToExpandedRowMap[expandedId] = (
        <EuiPageSection>
          {suggestion.reasoning && (
            <>
              <EuiText size="s">
                <strong>
                  {i18n.translate('xpack.knowledgeMining.suggestions.reasoning', {
                    defaultMessage: 'Reasoning',
                  })}
                </strong>
              </EuiText>
              <EuiText size="s">{suggestion.reasoning}</EuiText>
              <EuiSpacer size="s" />
            </>
          )}
          <EuiText size="s">
            <strong>
              {i18n.translate('xpack.knowledgeMining.suggestions.proposedContent', {
                defaultMessage: 'Proposed Content',
              })}
            </strong>
          </EuiText>
          <EuiCodeBlock language="markdown" paddingSize="s">
            {suggestion.proposed_content}
          </EuiCodeBlock>
        </EuiPageSection>
      );
    }
  }

  return (
    <>
      <EuiPageHeader
        pageTitle={i18n.translate('xpack.knowledgeMining.suggestions.title', {
          defaultMessage: 'Knowledge Suggestions',
        })}
        description={i18n.translate('xpack.knowledgeMining.suggestions.description', {
          defaultMessage:
            'Review AI-generated knowledge suggestions extracted from conversations. Approve to add them to the knowledge base.',
        })}
      />
      <EuiPageSection>
        {selectedIds.length > 0 && (
          <>
            <EuiCallOut
              announceOnMount
              title={i18n.translate('xpack.knowledgeMining.suggestions.bulkActions', {
                defaultMessage: '{count} suggestions selected',
                values: { count: selectedIds.length },
              })}
              size="s"
            >
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiButton size="s" color="success" onClick={handleBulkApprove}>
                    {i18n.translate('xpack.knowledgeMining.suggestions.bulkApprove', {
                      defaultMessage: 'Approve all',
                    })}
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty size="s" color="danger" onClick={handleBulkReject}>
                    {i18n.translate('xpack.knowledgeMining.suggestions.bulkReject', {
                      defaultMessage: 'Reject all',
                    })}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        )}
        <EuiBasicTable
          tableCaption={i18n.translate('xpack.knowledgeMining.suggestions.tableCaption', {
            defaultMessage: 'Knowledge suggestions',
          })}
          items={suggestions}
          columns={columns}
          loading={loading}
          itemId="id"
          isSelectable
          selection={{
            onSelectionChange: (selection) => setSelectedIds(selection.map((s) => s.id)),
          }}
          itemIdToExpandedRowMap={itemIdToExpandedRowMap}
          isExpandable
          rowProps={(item) => ({
            onClick: () => setExpandedId(expandedId === item.id ? null : item.id),
          })}
        />
      </EuiPageSection>
    </>
  );
};

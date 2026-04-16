/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import type {
  CriteriaWithPagination,
  EuiBasicTableColumn,
  EuiTableActionsColumnType,
} from '@elastic/eui';
import {
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldSearch,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiConfirmModal,
} from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { i18n } from '@kbn/i18n';
import type { MemoryNode, MemoryType, MemoryStatus } from '@kbn/agent-builder-common';
import { MemoryTypeBadge, MemoryStatusBadge } from './memory_type_badge';
import { MemoryDetailFlyout } from './memory_detail_flyout';
import { useMemoryList, useMemoryDelete, useMemoryDeleteAll } from '../../hooks/memory/use_memory_list';

const pageTitle = i18n.translate('xpack.agentBuilder.memory.list.pageTitle', {
  defaultMessage: 'Memory',
});

const typeOptions = [
  {
    value: '',
    text: i18n.translate('xpack.agentBuilder.memory.list.filter.allTypes', {
      defaultMessage: 'All types',
    }),
  },
  {
    value: 'semantic',
    text: i18n.translate('xpack.agentBuilder.memory.list.filter.semantic', {
      defaultMessage: 'Semantic',
    }),
  },
  {
    value: 'episodic',
    text: i18n.translate('xpack.agentBuilder.memory.list.filter.episodic', {
      defaultMessage: 'Episodic',
    }),
  },
  {
    value: 'procedural',
    text: i18n.translate('xpack.agentBuilder.memory.list.filter.procedural', {
      defaultMessage: 'Procedural',
    }),
  },
];

const statusOptions = [
  {
    value: '',
    text: i18n.translate('xpack.agentBuilder.memory.list.filter.allStatuses', {
      defaultMessage: 'All statuses',
    }),
  },
  {
    value: 'candidate',
    text: i18n.translate('xpack.agentBuilder.memory.list.filter.candidate', {
      defaultMessage: 'Candidate',
    }),
  },
  {
    value: 'provisional',
    text: i18n.translate('xpack.agentBuilder.memory.list.filter.provisional', {
      defaultMessage: 'Provisional',
    }),
  },
  {
    value: 'established',
    text: i18n.translate('xpack.agentBuilder.memory.list.filter.established', {
      defaultMessage: 'Established',
    }),
  },
  {
    value: 'consolidated',
    text: i18n.translate('xpack.agentBuilder.memory.list.filter.consolidated', {
      defaultMessage: 'Consolidated',
    }),
  },
  {
    value: 'suspect',
    text: i18n.translate('xpack.agentBuilder.memory.list.filter.suspect', {
      defaultMessage: 'Suspect',
    }),
  },
  {
    value: 'deprecated',
    text: i18n.translate('xpack.agentBuilder.memory.list.filter.deprecated', {
      defaultMessage: 'Deprecated',
    }),
  },
];

export const AgentBuilderMemoryList: React.FC = () => {
  const [selectedMemoryId, setSelectedMemoryId] = useState<string | undefined>(undefined);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | undefined>(undefined);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [searchText, setSearchText] = useState('');

  const {
    memories,
    total,
    isLoading,
    refetch,
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    pageIndex,
    setPageIndex,
    pageSize,
    setPageSize,
  } = useMemoryList();

  const { mutate: deleteMutation, isLoading: isDeleting } = useMemoryDelete({
    onSuccess: () => setPendingDeleteId(undefined),
  });

  const { mutate: deleteAllMutation, isLoading: isDeletingAll } = useMemoryDeleteAll({
    onSuccess: () => setShowDeleteAllConfirm(false),
  });

  const handleDelete = useCallback((id: string) => {
    setPendingDeleteId(id);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (pendingDeleteId) {
      deleteMutation(pendingDeleteId);
    }
  }, [pendingDeleteId, deleteMutation]);

  // Client-side text filter applied on top of server-side type/status filters
  const filteredMemories = searchText
    ? memories.filter(
        (m) =>
          m.summary.toLowerCase().includes(searchText.toLowerCase()) ||
          m.full.toLowerCase().includes(searchText.toLowerCase())
      )
    : memories;

  const columns: Array<EuiBasicTableColumn<MemoryNode>> = [
    {
      field: 'summary',
      name: i18n.translate('xpack.agentBuilder.memory.list.column.summary', {
        defaultMessage: 'Summary',
      }),
      render: (summary: string, memory: MemoryNode) => (
        <EuiButtonEmpty
          size="s"
          onClick={() => setSelectedMemoryId(memory.id)}
          data-test-subj={`agentBuilderMemoryListRowSummary-${memory.id}`}
        >
          <EuiText size="s" style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {summary}
          </EuiText>
        </EuiButtonEmpty>
      ),
      sortable: true,
    },
    {
      field: 'type',
      name: i18n.translate('xpack.agentBuilder.memory.list.column.type', {
        defaultMessage: 'Type',
      }),
      width: '110px',
      render: (type: MemoryType) => <MemoryTypeBadge type={type} />,
      sortable: true,
    },
    {
      field: 'status',
      name: i18n.translate('xpack.agentBuilder.memory.list.column.status', {
        defaultMessage: 'Status',
      }),
      width: '120px',
      render: (status: MemoryStatus) => <MemoryStatusBadge status={status} />,
      sortable: true,
    },
    {
      field: 'confidence',
      name: i18n.translate('xpack.agentBuilder.memory.list.column.confidence', {
        defaultMessage: 'Confidence',
      }),
      width: '100px',
      render: (confidence: number) => confidence?.toFixed(2),
      sortable: true,
    },
    {
      field: 'reinforcement_score',
      name: i18n.translate('xpack.agentBuilder.memory.list.column.reinforcement', {
        defaultMessage: 'Reinforcement',
      }),
      width: '110px',
      render: (score: number) => score?.toFixed(2),
      sortable: true,
    },
    {
      field: 'created_at',
      name: i18n.translate('xpack.agentBuilder.memory.list.column.createdAt', {
        defaultMessage: 'Created',
      }),
      width: '150px',
      render: (createdAt: string) => (createdAt ? new Date(createdAt).toLocaleDateString() : '-'),
      sortable: true,
    },
    {
      name: i18n.translate('xpack.agentBuilder.memory.list.column.actions', {
        defaultMessage: 'Actions',
      }),
      width: '120px',
      actions: [
        {
          type: 'icon' as const,
          icon: 'eye',
          name: i18n.translate('xpack.agentBuilder.memory.list.action.view', {
            defaultMessage: 'View',
          }),
          description: i18n.translate('xpack.agentBuilder.memory.list.action.viewDescription', {
            defaultMessage: 'View memory details',
          }),
          onClick: (memory: MemoryNode) => setSelectedMemoryId(memory.id),
          'data-test-subj': (memory: MemoryNode) => `agentBuilderMemoryListActionView-${memory.id}`,
        },
        {
          type: 'icon' as const,
          icon: 'pencil',
          name: i18n.translate('xpack.agentBuilder.memory.list.action.edit', {
            defaultMessage: 'Edit',
          }),
          description: i18n.translate('xpack.agentBuilder.memory.list.action.editDescription', {
            defaultMessage: 'Edit memory',
          }),
          onClick: (memory: MemoryNode) => setSelectedMemoryId(memory.id),
          'data-test-subj': (memory: MemoryNode) => `agentBuilderMemoryListActionEdit-${memory.id}`,
        },
        {
          type: 'icon' as const,
          icon: 'trash',
          color: 'danger' as const,
          name: i18n.translate('xpack.agentBuilder.memory.list.action.delete', {
            defaultMessage: 'Delete',
          }),
          description: i18n.translate('xpack.agentBuilder.memory.list.action.deleteDescription', {
            defaultMessage: 'Soft-delete memory (set to deprecated)',
          }),
          onClick: (memory: MemoryNode) => handleDelete(memory.id),
          'data-test-subj': (memory: MemoryNode) =>
            `agentBuilderMemoryListActionDelete-${memory.id}`,
        },
      ],
    } as EuiTableActionsColumnType<MemoryNode>,
  ];

  return (
    <>
      <KibanaPageTemplate data-test-subj="agentBuilderMemoryListPage">
        <KibanaPageTemplate.Header
          pageTitle={pageTitle}
          description={i18n.translate('xpack.agentBuilder.memory.list.pageDescription', {
            defaultMessage:
              'Manage the agent memory system. View, search, and administer memory nodes.',
          })}
          css={({ euiTheme }: { euiTheme: { colors: { backgroundBasePlain: string } } }) => ({
            backgroundColor: euiTheme.colors.backgroundBasePlain,
            borderBlockEnd: 'none',
          })}
          rightSideItems={[
            <EuiButton
              key="refresh"
              iconType="refresh"
              onClick={() => refetch()}
              isLoading={isLoading}
              data-test-subj="agentBuilderMemoryListRefresh"
            >
              {i18n.translate('xpack.agentBuilder.memory.list.refreshButton', {
                defaultMessage: 'Refresh',
              })}
            </EuiButton>,
            <EuiButton
              key="deleteAll"
              iconType="trash"
              color="danger"
              onClick={() => setShowDeleteAllConfirm(true)}
              isLoading={isDeletingAll}
              isDisabled={total === 0}
              data-test-subj="agentBuilderMemoryListDeleteAll"
            >
              {i18n.translate('xpack.agentBuilder.memory.list.deleteAllButton', {
                defaultMessage: 'Delete all',
              })}
            </EuiButton>,
          ]}
        />
        <KibanaPageTemplate.Section>
          <EuiFlexGroup gutterSize="m" alignItems="center" wrap>
            <EuiFlexItem grow={3}>
              <EuiFieldSearch
                placeholder={i18n.translate('xpack.agentBuilder.memory.list.searchPlaceholder', {
                  defaultMessage: 'Search memories',
                })}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                fullWidth
                data-test-subj="agentBuilderMemoryListSearch"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={1}>
              <EuiSelect
                options={typeOptions}
                value={typeFilter ?? ''}
                onChange={(e) => setTypeFilter((e.target.value as MemoryType) || undefined)}
                aria-label={i18n.translate('xpack.agentBuilder.memory.list.filter.typeLabel', {
                  defaultMessage: 'Filter by type',
                })}
                data-test-subj="agentBuilderMemoryListTypeFilter"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={1}>
              <EuiSelect
                options={statusOptions}
                value={statusFilter ?? ''}
                onChange={(e) => setStatusFilter((e.target.value as MemoryStatus) || undefined)}
                aria-label={i18n.translate('xpack.agentBuilder.memory.list.filter.statusLabel', {
                  defaultMessage: 'Filter by status',
                })}
                data-test-subj="agentBuilderMemoryListStatusFilter"
              />
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="m" />

          <EuiBasicTable
            tableCaption={i18n.translate('xpack.agentBuilder.memory.list.tableCaption', {
              defaultMessage: 'Memory nodes: {count} total',
              values: { count: total },
            })}
            data-test-subj="agentBuilderMemoryListTable"
            items={filteredMemories}
            itemId="id"
            columns={columns}
            loading={isLoading}
            pagination={{
              pageIndex,
              pageSize,
              totalItemCount: total,
              pageSizeOptions: [10, 20, 50, 100],
              showPerPageOptions: true,
            }}
            onChange={({ page }: CriteriaWithPagination<MemoryNode>) => {
              if (page) {
                setPageIndex(page.index);
                if (page.size !== pageSize) {
                  setPageSize(page.size);
                  setPageIndex(0);
                }
              }
            }}
            sorting={{ sort: { field: 'created_at', direction: 'desc' } }}
            rowProps={(memory) => ({
              'data-test-subj': `agentBuilderMemoryListRow-${memory.id}`,
            })}
            noItemsMessage={
              isLoading ? undefined : (
                <EuiText color="subdued" textAlign="center" size="s">
                  {i18n.translate('xpack.agentBuilder.memory.list.noItems', {
                    defaultMessage: 'No memories found',
                  })}
                </EuiText>
              )
            }
          />
        </KibanaPageTemplate.Section>
      </KibanaPageTemplate>

      {selectedMemoryId && (
        <MemoryDetailFlyout
          memoryId={selectedMemoryId}
          onClose={() => setSelectedMemoryId(undefined)}
          onOpenMemory={setSelectedMemoryId}
        />
      )}

      {showDeleteAllConfirm && (
        <EuiConfirmModal
          title={i18n.translate('xpack.agentBuilder.memory.list.deleteAllModal.title', {
            defaultMessage: 'Delete all memories',
          })}
          onCancel={() => setShowDeleteAllConfirm(false)}
          onConfirm={() => deleteAllMutation()}
          cancelButtonText={i18n.translate(
            'xpack.agentBuilder.memory.list.deleteAllModal.cancelButton',
            { defaultMessage: 'Cancel' }
          )}
          confirmButtonText={i18n.translate(
            'xpack.agentBuilder.memory.list.deleteAllModal.confirmButton',
            { defaultMessage: 'Delete all' }
          )}
          buttonColor="danger"
          isLoading={isDeletingAll}
          data-test-subj="agentBuilderMemoryDeleteAllModal"
        >
          <EuiText>
            <p>
              {i18n.translate('xpack.agentBuilder.memory.list.deleteAllModal.body', {
                defaultMessage:
                  'This will permanently delete all {count} memories. This action cannot be undone.',
                values: { count: total },
              })}
            </p>
          </EuiText>
        </EuiConfirmModal>
      )}

      {pendingDeleteId && (
        <EuiConfirmModal
          title={i18n.translate('xpack.agentBuilder.memory.list.deleteModal.title', {
            defaultMessage: 'Delete memory',
          })}
          onCancel={() => setPendingDeleteId(undefined)}
          onConfirm={handleConfirmDelete}
          cancelButtonText={i18n.translate(
            'xpack.agentBuilder.memory.list.deleteModal.cancelButton',
            { defaultMessage: 'Cancel' }
          )}
          confirmButtonText={i18n.translate(
            'xpack.agentBuilder.memory.list.deleteModal.confirmButton',
            { defaultMessage: 'Delete' }
          )}
          buttonColor="danger"
          isLoading={isDeleting}
          data-test-subj="agentBuilderMemoryDeleteModal"
        >
          <EuiText>
            <p>
              {i18n.translate('xpack.agentBuilder.memory.list.deleteModal.body', {
                defaultMessage:
                  'This will soft-delete the memory by setting its status to deprecated. It will be removed automatically after 30 days.',
              })}
            </p>
          </EuiText>
        </EuiConfirmModal>
      )}
    </>
  );
};

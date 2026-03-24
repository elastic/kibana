/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiConfirmModal,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLink,
  EuiLoadingSpinner,
  EuiMarkdownFormat,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
  EuiTreeView,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  useMemoryTree,
  useMemorySearch,
  useMemoryEntry,
  useMemoryHistory,
  useMemoryMutations,
} from './use_memory';
import type { MemoryTreeNode, MemoryVersionRecord } from './types';

export function MemoryTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const { data: treeData, isLoading: isTreeLoading } = useMemoryTree();
  const { data: searchData, isLoading: isSearchLoading } = useMemorySearch(searchQuery);

  const isSearchActive = searchQuery.length >= 2;

  const treeItems = useMemo(() => {
    if (!treeData?.tree) return [];
    return toTreeItems(treeData.tree, setSelectedEntryId);
  }, [treeData]);

  const handleCloseFlyout = useCallback(() => {
    setSelectedEntryId(null);
    setShowHistory(false);
  }, []);

  return (
    <>
      <EuiFieldSearch
        placeholder={i18n.translate('xpack.streams.memory.searchPlaceholder', {
          defaultMessage: 'Search memory entries...',
        })}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        isClearable
        fullWidth
        data-test-subj="streamsMemorySearch"
      />
      <EuiSpacer size="m" />

      {isSearchActive ? (
        isSearchLoading ? (
          <EuiLoadingSpinner size="l" />
        ) : (
          <EuiFlexGroup direction="column" gutterSize="s">
            {searchData?.results.map((result) => (
              <EuiFlexItem key={result.id}>
                <EuiFlexGroup direction="column" gutterSize="xs">
                  <EuiFlexItem>
                    <EuiLink onClick={() => setSelectedEntryId(result.id)}>
                      <strong>{result.title}</strong>
                    </EuiLink>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="xs" color="subdued">
                      {result.path}
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="s">{result.snippet}</EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            ))}
            {searchData?.results.length === 0 && (
              <EuiText color="subdued">
                {i18n.translate('xpack.streams.memory.noResults', {
                  defaultMessage: 'No memory entries found.',
                })}
              </EuiText>
            )}
          </EuiFlexGroup>
        )
      ) : isTreeLoading ? (
        <EuiLoadingSpinner size="l" />
      ) : treeItems.length > 0 ? (
        <EuiTreeView
          items={treeItems}
          expandByDefault
          aria-label={i18n.translate('xpack.streams.memory.treeAriaLabel', {
            defaultMessage: 'Memory entries tree',
          })}
        />
      ) : (
        <EuiText color="subdued">
          {i18n.translate('xpack.streams.memory.empty', {
            defaultMessage:
              'No memory entries yet. Agents will automatically create entries as they learn, or you can create entries manually.',
          })}
        </EuiText>
      )}

      {selectedEntryId && !showHistory && (
        <EntryFlyout
          entryId={selectedEntryId}
          onClose={handleCloseFlyout}
          onShowHistory={() => setShowHistory(true)}
        />
      )}
      {selectedEntryId && showHistory && (
        <HistoryFlyout
          entryId={selectedEntryId}
          onClose={handleCloseFlyout}
          onBack={() => setShowHistory(false)}
        />
      )}
    </>
  );
}

const toTreeItems = (
  nodes: MemoryTreeNode[],
  onSelect: (id: string) => void
): Array<{
  id: string;
  label: React.ReactNode;
  children?: Array<{ id: string; label: React.ReactNode }>;
}> => {
  return nodes.map((node) => ({
    id: node.path,
    label: node.id ? (
      <EuiLink onClick={() => onSelect(node.id!)}>{node.title}</EuiLink>
    ) : (
      <EuiText size="s">{node.title}</EuiText>
    ),
    ...(node.children.length > 0 ? { children: toTreeItems(node.children, onSelect) } : {}),
  }));
};

function EntryFlyout({
  entryId,
  onClose,
  onShowHistory,
}: {
  entryId: string;
  onClose: () => void;
  onShowHistory: () => void;
}) {
  const { data: entry, isLoading } = useMemoryEntry(entryId);
  const { updateEntry, deleteEntry } = useMemoryMutations();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleEdit = useCallback(() => {
    if (entry) {
      setEditContent(entry.content);
      setIsEditing(true);
    }
  }, [entry]);

  const handleSave = useCallback(() => {
    if (entry && editContent !== entry.content) {
      updateEntry.mutate(
        { id: entry.id, content: editContent, change_summary: 'Manual edit via UI' },
        { onSuccess: () => setIsEditing(false) }
      );
    } else {
      setIsEditing(false);
    }
  }, [entry, editContent, updateEntry]);

  const handleDelete = useCallback(() => {
    if (entry) {
      deleteEntry.mutate(entry.id, { onSuccess: onClose });
    }
  }, [entry, deleteEntry, onClose]);

  return (
    <>
      <EuiFlyout
        onClose={onClose}
        size="m"
        data-test-subj="streamsMemoryEntryFlyout"
        aria-label={i18n.translate('xpack.streams.memory.entryFlyoutAriaLabel', {
          defaultMessage: 'Memory entry detail',
        })}
      >
        <EuiFlyoutHeader hasBorder>
          {isLoading ? (
            <EuiLoadingSpinner size="l" />
          ) : entry ? (
            <>
              <EuiTitle size="m">
                <h2>{entry.title}</h2>
              </EuiTitle>
              <EuiText size="xs" color="subdued">
                {entry.path}
              </EuiText>
              <EuiSpacer size="xs" />
              <EuiFlexGroup gutterSize="s" wrap>
                {entry.tags.map((tag) => (
                  <EuiFlexItem key={tag} grow={false}>
                    <EuiBadge>{tag}</EuiBadge>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
              <EuiSpacer size="xs" />
              <EuiText size="xs" color="subdued">
                {i18n.translate('xpack.streams.memory.entryMeta', {
                  defaultMessage: 'Version {version} · Updated {updatedAt} by {updatedBy}',
                  values: {
                    version: entry.version,
                    updatedAt: new Date(entry.updated_at).toLocaleString(),
                    updatedBy: entry.updated_by,
                  },
                })}
              </EuiText>
            </>
          ) : (
            <EuiText>
              {i18n.translate('xpack.streams.memory.entryNotFound', {
                defaultMessage: 'Memory entry not found.',
              })}
            </EuiText>
          )}
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          {entry &&
            (isEditing ? (
              <>
                <EuiTextArea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  fullWidth
                  rows={20}
                  data-test-subj="streamsMemoryEditArea"
                />
                <EuiSpacer size="m" />
                <EuiFlexGroup gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      fill
                      onClick={handleSave}
                      isLoading={updateEntry.isPending}
                      data-test-subj="streamsMemorySaveButton"
                    >
                      {i18n.translate('xpack.streams.memory.saveButton', {
                        defaultMessage: 'Save',
                      })}
                    </EuiButton>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty onClick={() => setIsEditing(false)}>
                      {i18n.translate('xpack.streams.memory.cancelButton', {
                        defaultMessage: 'Cancel',
                      })}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </>
            ) : (
              <EuiMarkdownFormat>{entry.content}</EuiMarkdownFormat>
            ))}
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiButton onClick={onShowHistory} size="s">
                    {i18n.translate('xpack.streams.memory.historyButton', {
                      defaultMessage: 'History',
                    })}
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton onClick={handleEdit} disabled={isEditing} size="s">
                    {i18n.translate('xpack.streams.memory.editButton', {
                      defaultMessage: 'Edit',
                    })}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty color="danger" onClick={() => setShowDeleteModal(true)} size="s">
                {i18n.translate('xpack.streams.memory.deleteButton', {
                  defaultMessage: 'Delete',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>

      {showDeleteModal && entry && (
        <EuiConfirmModal
          aria-label={i18n.translate('xpack.streams.memory.deleteConfirmAriaLabel', {
            defaultMessage: 'Confirm delete memory entry',
          })}
          title={i18n.translate('xpack.streams.memory.deleteConfirmTitle', {
            defaultMessage: 'Delete memory entry',
          })}
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          cancelButtonText={i18n.translate('xpack.streams.memory.deleteConfirmCancel', {
            defaultMessage: 'Cancel',
          })}
          confirmButtonText={i18n.translate('xpack.streams.memory.deleteConfirmButton', {
            defaultMessage: 'Delete',
          })}
          buttonColor="danger"
        >
          {i18n.translate('xpack.streams.memory.deleteConfirmBody', {
            defaultMessage:
              'Are you sure you want to delete "{title}"? This action cannot be undone.',
            values: { title: entry.title },
          })}
        </EuiConfirmModal>
      )}
    </>
  );
}

function HistoryFlyout({
  entryId,
  onClose,
  onBack,
}: {
  entryId: string;
  onClose: () => void;
  onBack: () => void;
}) {
  const { data: entry } = useMemoryEntry(entryId);
  const { data: historyData, isLoading } = useMemoryHistory(entryId);
  const { rollbackEntry } = useMemoryMutations();

  const handleRollback = useCallback(
    (version: number) => {
      rollbackEntry.mutate({ entryId, version });
    },
    [entryId, rollbackEntry]
  );

  const columns: Array<EuiBasicTableColumn<MemoryVersionRecord>> = [
    {
      field: 'version',
      name: i18n.translate('xpack.streams.memory.history.versionColumn', {
        defaultMessage: 'Version',
      }),
      width: '70px',
    },
    {
      field: 'change_type',
      name: i18n.translate('xpack.streams.memory.history.changeTypeColumn', {
        defaultMessage: 'Change',
      }),
      width: '90px',
      render: (changeType: string) => <EuiBadge>{changeType}</EuiBadge>,
    },
    {
      field: 'change_summary',
      name: i18n.translate('xpack.streams.memory.history.summaryColumn', {
        defaultMessage: 'Summary',
      }),
    },
    {
      field: 'created_at',
      name: i18n.translate('xpack.streams.memory.history.dateColumn', {
        defaultMessage: 'Date',
      }),
      width: '140px',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      name: i18n.translate('xpack.streams.memory.history.actionsColumn', {
        defaultMessage: 'Actions',
      }),
      width: '90px',
      render: (record: MemoryVersionRecord) => {
        const isCurrentVersion = entry && record.version === entry.version;
        return isCurrentVersion ? (
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.streams.memory.history.currentLabel', {
              defaultMessage: 'Current',
            })}
          </EuiText>
        ) : (
          <EuiButton
            size="s"
            onClick={() => handleRollback(record.version)}
            isLoading={rollbackEntry.isPending}
          >
            {i18n.translate('xpack.streams.memory.history.rollbackButton', {
              defaultMessage: 'Rollback',
            })}
          </EuiButton>
        );
      },
    },
  ];

  return (
    <EuiFlyout
      onClose={onClose}
      size="m"
      data-test-subj="streamsMemoryHistoryFlyout"
      aria-label={i18n.translate('xpack.streams.memory.historyFlyoutAriaLabel', {
        defaultMessage: 'Memory entry version history',
      })}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="arrowLeft" onClick={onBack} size="s">
              {i18n.translate('xpack.streams.memory.history.backButton', {
                defaultMessage: 'Back',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2>
                {i18n.translate('xpack.streams.memory.history.title', {
                  defaultMessage: 'Version History',
                })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
        {entry && (
          <EuiText size="xs" color="subdued">
            {entry.title}
          </EuiText>
        )}
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {isLoading ? (
          <EuiLoadingSpinner size="l" />
        ) : (
          <EuiBasicTable
            items={historyData?.history ?? []}
            columns={columns}
            tableCaption={i18n.translate('xpack.streams.memory.history.tableCaption', {
              defaultMessage: 'Version history',
            })}
            data-test-subj="streamsMemoryHistoryTable"
          />
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}

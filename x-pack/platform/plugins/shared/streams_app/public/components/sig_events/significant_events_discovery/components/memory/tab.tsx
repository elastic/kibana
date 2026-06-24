/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { diffLines } from 'diff';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiComboBox,
  EuiConfirmModal,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFieldSearch,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiMarkdownFormat,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTextArea,
  EuiTitle,
  EuiToolTip,
  EuiTreeView,
  transparentize,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiBasicTableColumn, EuiComboBoxOptionOption } from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { useStreamsPrivileges } from '../../../../../hooks/use_streams_privileges';
import {
  useConsolidateMemory,
  useMemoryEntry,
  useMemoryHistory,
  useMemoryMutations,
  useMemorySearch,
  useMemoryTree,
  useMemoryVersion,
  useRecentChanges,
  useScrapeConversations,
  useSynthesizeMemory,
  useDetectGaps,
} from './use_memory';
import type { MemoryCategoryNode, MemoryEntry, MemoryVersionRecord } from './types';

export function MemoryTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [selectedChange, setSelectedChange] = useState<MemoryVersionRecord | null>(null);
  const [isActionsPopoverOpen, setIsActionsPopoverOpen] = useState(false);

  const {
    ui: { manage: canManage },
  } = useStreamsPrivileges();

  const { data: treeData, isLoading: isTreeLoading } = useMemoryTree();
  const { data: searchData, isLoading: isSearchLoading } = useMemorySearch(searchQuery);
  const { data: recentChangesData, isLoading: isRecentChangesLoading } = useRecentChanges();

  const scrapeConversations = useScrapeConversations();
  const consolidateMemory = useConsolidateMemory();
  const synthesizeMemory = useSynthesizeMemory();
  const detectGaps = useDetectGaps();

  const workflowActions: Array<{
    key: string;
    icon: string;
    label: string;
    testSubj: string;
    mutation: { isLoading: boolean; mutate: () => void };
  }> = [
    {
      key: 'scrape',
      icon: 'refresh',
      label: i18n.translate('xpack.streams.memory.scrapeButton', {
        defaultMessage: 'Scrape Conversations',
      }),
      testSubj: 'streamsMemoryScrapeButton',
      mutation: scrapeConversations,
    },
    {
      key: 'consolidate',
      icon: 'broom',
      label: i18n.translate('xpack.streams.memory.consolidateButton', {
        defaultMessage: 'Consolidate Memory',
      }),
      testSubj: 'streamsMemoryConsolidateButton',
      mutation: consolidateMemory,
    },
    {
      key: 'synthesize',
      icon: 'sparkles',
      label: i18n.translate('xpack.streams.memory.synthesizeButton', {
        defaultMessage: 'Synthesize Memory',
      }),
      testSubj: 'streamsMemorySynthesizeButton',
      mutation: synthesizeMemory,
    },
    {
      key: 'detectGaps',
      icon: 'inspect',
      label: i18n.translate('xpack.streams.memory.detectGapsButton', {
        defaultMessage: 'Detect Gaps',
      }),
      testSubj: 'streamsMemoryDetectGapsButton',
      mutation: detectGaps,
    },
  ];

  const isSearchActive = searchQuery.length >= 2;

  const treeItems = useMemo(() => {
    if (!treeData?.tree) return [];
    return toTreeItems(treeData.tree, setSelectedEntryId);
  }, [treeData]);

  return (
    <>
      <EuiFlexGroup
        gutterSize="l"
        className={css`
          height: 100%;
          min-height: 0;
        `}
      >
        {/* Left column: search + tree/search results */}
        <EuiFlexItem
          grow={2}
          className={css`
            min-height: 0;
          `}
        >
          <EuiFlexGroup
            direction="column"
            gutterSize="m"
            className={css`
              height: 100%;
            `}
          >
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
                <EuiFlexItem>
                  <EuiFieldSearch
                    placeholder={i18n.translate('xpack.streams.memory.searchPlaceholder', {
                      defaultMessage: 'Search memory entries...',
                    })}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    incremental
                    isClearable
                    fullWidth
                    data-test-subj="streamsMemorySearch"
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiPopover
                    button={
                      <EuiButtonIcon
                        iconType="boxesHorizontal"
                        aria-label={i18n.translate('xpack.streams.memory.workflowActionsButton', {
                          defaultMessage: 'Workflow actions',
                        })}
                        onClick={() => setIsActionsPopoverOpen((v) => !v)}
                        isDisabled={!canManage}
                        data-test-subj="streamsMemoryWorkflowActionsButton"
                      />
                    }
                    isOpen={isActionsPopoverOpen}
                    closePopover={() => setIsActionsPopoverOpen(false)}
                    panelPaddingSize="none"
                    anchorPosition="downRight"
                  >
                    <EuiContextMenuPanel
                      items={workflowActions.map((action) => (
                        <EuiContextMenuItem
                          key={action.key}
                          icon={
                            action.mutation.isLoading ? <EuiLoadingSpinner size="s" /> : action.icon
                          }
                          onClick={() => {
                            action.mutation.mutate();
                            setIsActionsPopoverOpen(false);
                          }}
                          disabled={action.mutation.isLoading}
                          data-test-subj={action.testSubj}
                        >
                          {action.label}
                        </EuiContextMenuItem>
                      ))}
                    />
                  </EuiPopover>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem
              className={css`
                overflow-y: auto;
                min-height: 0;
              `}
            >
              {isSearchActive ? (
                isSearchLoading ? (
                  <EuiLoadingSpinner size="l" />
                ) : (
                  <EuiFlexGroup direction="column" gutterSize="s">
                    {(searchData?.results ?? []).map((result) => (
                      <EuiFlexItem key={result.id}>
                        <EuiPanel hasShadow={false} hasBorder paddingSize="s">
                          <EuiLink onClick={() => setSelectedEntryId(result.id)}>
                            <strong>{result.title}</strong>
                          </EuiLink>
                          <EuiSpacer size="xs" />
                          <EuiText size="s">{result.snippet}</EuiText>
                          <EuiSpacer size="xs" />
                          <EuiFlexGroup gutterSize="xs" alignItems="center" wrap>
                            <EuiFlexItem grow={false}>
                              <EuiText size="xs" color="subdued">
                                {formatRelativeTime(result.updated_at)} · {result.updated_by}
                              </EuiText>
                            </EuiFlexItem>
                            {result.tags.map((tag) => (
                              <EuiFlexItem key={tag} grow={false}>
                                <EuiBadge color="hollow">{tag}</EuiBadge>
                              </EuiFlexItem>
                            ))}
                          </EuiFlexGroup>
                        </EuiPanel>
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
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        {/* Right column: recent changes */}
        {!isSearchActive && (
          <EuiFlexItem
            grow={1}
            className={css`
              overflow-y: auto;
              min-height: 0;
            `}
          >
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.streams.memory.recentChanges.title', {
                  defaultMessage: 'Recent Changes',
                })}
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            {isRecentChangesLoading ? (
              <EuiLoadingSpinner size="l" />
            ) : (recentChangesData?.changes ?? []).length > 0 ? (
              <EuiFlexGroup direction="column" gutterSize="s">
                {(recentChangesData?.changes ?? []).map((change) => (
                  <EuiFlexItem key={change.id} grow={false}>
                    <RecentChangeItem change={change} onClick={() => setSelectedChange(change)} />
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            ) : (
              <EuiText size="s" color="subdued">
                {i18n.translate('xpack.streams.memory.recentChanges.empty', {
                  defaultMessage: 'No recent changes.',
                })}
              </EuiText>
            )}
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      {selectedEntryId && (
        <EntryFlyout entryId={selectedEntryId} onClose={() => setSelectedEntryId(null)} />
      )}
      {selectedChange && (
        <ChangeFlyout
          change={selectedChange}
          onClose={() => setSelectedChange(null)}
          onViewEntry={(id) => {
            setSelectedChange(null);
            setSelectedEntryId(id);
          }}
        />
      )}
    </>
  );
}

interface TreeItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactElement;
  iconWhenExpanded?: React.ReactElement;
  children?: TreeItem[];
}

const toTreeItems = (nodes: MemoryCategoryNode[], onSelect: (id: string) => void): TreeItem[] => {
  return nodes.map((node) => {
    const pageItems: TreeItem[] = node.pages.map((page) => ({
      id: page.id,
      label: <EuiLink onClick={() => onSelect(page.id)}>{page.title}</EuiLink>,
    }));

    const childItems = node.children.length > 0 ? toTreeItems(node.children, onSelect) : [];
    const allChildren = [...pageItems, ...childItems];

    return {
      id: node.category,
      label: node.name,
      icon: <EuiIcon type="folderClosed" size="s" aria-hidden={true} />,
      iconWhenExpanded: <EuiIcon type="folderOpen" size="s" aria-hidden={true} />,
      ...(allChildren.length > 0 ? { children: allChildren } : {}),
    };
  });
};

type FlyoutTab = 'content' | 'history';

function EntryFlyout({ entryId, onClose }: { entryId: string; onClose: () => void }) {
  const { data: entry, isLoading } = useMemoryEntry(entryId);
  const { updateEntry, deleteEntry } = useMemoryMutations();
  const [activeTab, setActiveTab] = useState<FlyoutTab>('content');
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState<Array<EuiComboBoxOptionOption<string>>>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);

  const startEditing = useCallback(() => {
    if (entry) {
      setEditTitle(entry.title);
      setEditContent(entry.content);
      setEditTags(entry.tags.map((tag) => ({ label: tag })));
      setIsEditing(true);
    }
  }, [entry]);

  const editTagLabels = editTags.map((t) => t.label);
  const isDirty =
    isEditing &&
    !!entry &&
    (editTitle !== entry.title ||
      editContent !== entry.content ||
      editTagLabels.length !== entry.tags.length ||
      editTagLabels.some((tag, i) => tag !== entry.tags[i]));

  const handleSave = useCallback(() => {
    if (!entry) return;
    if (!isDirty) {
      setIsEditing(false);
      return;
    }
    updateEntry.mutate(
      {
        id: entry.id,
        ...(editTitle !== entry.title ? { title: editTitle } : {}),
        ...(editContent !== entry.content ? { content: editContent } : {}),
        tags: editTagLabels,
        change_summary: 'Manual edit via UI',
      },
      { onSuccess: () => setIsEditing(false) }
    );
  }, [entry, isDirty, editTitle, editContent, editTagLabels, updateEntry]);

  const handleDelete = useCallback(() => {
    if (entry) {
      deleteEntry.mutate(entry.id, { onSuccess: onClose });
    }
  }, [entry, deleteEntry, onClose]);

  const handleClose = useCallback(() => {
    if (isDirty) {
      setShowDiscardModal(true);
    } else {
      onClose();
    }
  }, [isDirty, onClose]);

  return (
    <>
      <EuiFlyout
        onClose={handleClose}
        size="m"
        data-test-subj="streamsMemoryEntryFlyout"
        aria-label={i18n.translate('xpack.streams.memory.entryFlyoutAriaLabel', {
          defaultMessage: 'Memory entry detail',
        })}
      >
        <EuiFlyoutHeader hasBorder={false}>
          {isLoading ? (
            <EuiLoadingSpinner size="l" />
          ) : entry ? (
            <>
              <EuiTitle size="m">
                <h2>{entry.title}</h2>
              </EuiTitle>
              {entry.categories.length > 0 && (
                <EuiText size="xs" color="subdued">
                  {entry.categories.join(' · ')}
                </EuiText>
              )}
              <EuiSpacer size="xs" />
              <EuiText size="xs" color="subdued">
                {i18n.translate('xpack.streams.memory.entryMeta', {
                  defaultMessage:
                    'v{version} · Created by {createdBy} · Updated {updatedAt} by {updatedBy}',
                  values: {
                    version: entry.version,
                    createdBy: entry.created_by,
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
          <EuiSpacer size="s" />
          <EuiTabs size="s">
            <EuiTab isSelected={activeTab === 'content'} onClick={() => setActiveTab('content')}>
              {i18n.translate('xpack.streams.memory.contentTab', { defaultMessage: 'Content' })}
            </EuiTab>
            <EuiTab
              isSelected={activeTab === 'history'}
              onClick={() => setActiveTab('history')}
              disabled={isEditing}
            >
              {i18n.translate('xpack.streams.memory.historyTab', { defaultMessage: 'History' })}
            </EuiTab>
          </EuiTabs>
        </EuiFlyoutHeader>

        <EuiFlyoutBody>
          {entry && activeTab === 'content' && (
            <>
              {isEditing ? (
                <EuiFlexGroup direction="column" gutterSize="m">
                  <EuiFlexItem>
                    <EuiTitle size="xxs">
                      <h4>
                        {i18n.translate('xpack.streams.memory.titleLabel', {
                          defaultMessage: 'Title',
                        })}
                      </h4>
                    </EuiTitle>
                    <EuiSpacer size="xs" />
                    <EuiFieldText
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      fullWidth
                      data-test-subj="streamsMemoryEditTitle"
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiTitle size="xxs">
                      <h4>
                        {i18n.translate('xpack.streams.memory.contentLabel', {
                          defaultMessage: 'Content',
                        })}
                      </h4>
                    </EuiTitle>
                    <EuiSpacer size="xs" />
                    <EuiTextArea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      fullWidth
                      rows={18}
                      data-test-subj="streamsMemoryEditArea"
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiTitle size="xxs">
                      <h4>
                        {i18n.translate('xpack.streams.memory.tagsLabel', {
                          defaultMessage: 'Tags',
                        })}
                      </h4>
                    </EuiTitle>
                    <EuiSpacer size="xs" />
                    <EuiComboBox
                      options={[]}
                      selectedOptions={editTags}
                      onChange={setEditTags}
                      onCreateOption={(searchValue) =>
                        setEditTags((prev) => [...prev, { label: searchValue }])
                      }
                      isClearable
                      fullWidth
                      noSuggestions
                      data-test-subj="streamsMemoryEditTags"
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              ) : (
                <>
                  <EuiMarkdownFormat>{entry.content}</EuiMarkdownFormat>
                  {entry.tags.length > 0 && (
                    <>
                      <EuiSpacer size="m" />
                      <EuiFlexGroup gutterSize="xs" wrap>
                        {entry.tags.map((tag) => (
                          <EuiFlexItem key={tag} grow={false}>
                            <EuiBadge color="hollow">{tag}</EuiBadge>
                          </EuiFlexItem>
                        ))}
                      </EuiFlexGroup>
                    </>
                  )}
                </>
              )}
            </>
          )}
          {entry && activeTab === 'history' && <HistoryPanel entryId={entryId} entry={entry} />}
        </EuiFlyoutBody>

        <EuiFlyoutFooter>
          {activeTab === 'content' &&
            (isEditing ? (
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    onClick={handleSave}
                    isLoading={updateEntry.isLoading}
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
            ) : (
              <EuiFlexGroup justifyContent="spaceBetween">
                <EuiFlexItem grow={false}>
                  <EuiButton
                    onClick={startEditing}
                    size="s"
                    iconType="pencil"
                    isDisabled={!entry}
                    data-test-subj="streamsMemoryEditButton"
                  >
                    {i18n.translate('xpack.streams.memory.editButton', {
                      defaultMessage: 'Edit',
                    })}
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    color="danger"
                    onClick={() => setShowDeleteModal(true)}
                    size="s"
                    isDisabled={!entry}
                  >
                    {i18n.translate('xpack.streams.memory.deleteButton', {
                      defaultMessage: 'Delete',
                    })}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            ))}
        </EuiFlyoutFooter>
      </EuiFlyout>

      {showDeleteModal && entry && (
        <DeleteEntryModal
          title={entry.title}
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
        />
      )}

      {showDiscardModal && (
        <DiscardChangesModal
          onCancel={() => setShowDiscardModal(false)}
          onConfirm={() => {
            setShowDiscardModal(false);
            setIsEditing(false);
            onClose();
          }}
        />
      )}
    </>
  );
}

function DeleteEntryModal({
  title,
  onCancel,
  onConfirm,
}: {
  title: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <EuiConfirmModal
      aria-label={i18n.translate('xpack.streams.memory.deleteConfirmAriaLabel', {
        defaultMessage: 'Confirm delete memory entry',
      })}
      title={i18n.translate('xpack.streams.memory.deleteConfirmTitle', {
        defaultMessage: 'Delete memory entry',
      })}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={i18n.translate('xpack.streams.memory.deleteConfirmCancel', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate('xpack.streams.memory.deleteConfirmButton', {
        defaultMessage: 'Delete',
      })}
      buttonColor="danger"
    >
      {i18n.translate('xpack.streams.memory.deleteConfirmBody', {
        defaultMessage: 'Are you sure you want to delete "{title}"? This action cannot be undone.',
        values: { title },
      })}
    </EuiConfirmModal>
  );
}

function DiscardChangesModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <EuiConfirmModal
      aria-label={i18n.translate('xpack.streams.memory.discardConfirmAriaLabel', {
        defaultMessage: 'Confirm discard changes',
      })}
      title={i18n.translate('xpack.streams.memory.discardConfirmTitle', {
        defaultMessage: 'Discard unsaved changes?',
      })}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={i18n.translate('xpack.streams.memory.discardConfirmCancel', {
        defaultMessage: 'Keep editing',
      })}
      confirmButtonText={i18n.translate('xpack.streams.memory.discardConfirmButton', {
        defaultMessage: 'Discard',
      })}
      buttonColor="danger"
    >
      {i18n.translate('xpack.streams.memory.discardConfirmBody', {
        defaultMessage: 'You have unsaved changes. Are you sure you want to discard them?',
      })}
    </EuiConfirmModal>
  );
}

function HistoryPanel({ entryId, entry }: { entryId: string; entry: MemoryEntry }) {
  const { data: historyData, isLoading } = useMemoryHistory(entryId);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const { euiTheme } = useEuiTheme();
  const selectedRowBackground = transparentize(euiTheme.colors.primary, 0.1);

  const selectedRecord = useMemo(() => {
    if (selectedVersion === null || !historyData?.history) return undefined;
    return historyData.history.find((r) => r.version === selectedVersion);
  }, [selectedVersion, historyData]);

  const previousVersion = selectedVersion !== null ? selectedVersion - 1 : undefined;
  const { data: previousRecord } = useMemoryVersion(
    previousVersion !== undefined && previousVersion >= 1 ? entryId : undefined,
    previousVersion !== undefined && previousVersion >= 1 ? previousVersion : undefined
  );

  const columns: Array<EuiBasicTableColumn<MemoryVersionRecord>> = [
    {
      field: 'version',
      name: i18n.translate('xpack.streams.memory.history.versionColumn', {
        defaultMessage: 'v',
      }),
      width: '50px',
      render: (version: number) =>
        version === entry.version ? <strong>{version}</strong> : <>{version}</>,
    },
    {
      field: 'change_type',
      name: i18n.translate('xpack.streams.memory.history.changeTypeColumn', {
        defaultMessage: 'Change',
      }),
      width: '90px',
      render: (changeType: string) => (
        <EuiBadge color={changeTypeColors[changeType] ?? 'default'}>{changeType}</EuiBadge>
      ),
    },
    {
      field: 'change_summary',
      name: i18n.translate('xpack.streams.memory.history.summaryColumn', {
        defaultMessage: 'Summary',
      }),
    },
    {
      field: 'created_by',
      name: i18n.translate('xpack.streams.memory.history.authorColumn', {
        defaultMessage: 'Author',
      }),
      width: '120px',
    },
    {
      field: 'created_at',
      name: i18n.translate('xpack.streams.memory.history.dateColumn', {
        defaultMessage: 'Date',
      }),
      width: '130px',
      render: (date: string) => (
        <EuiToolTip content={new Date(date).toLocaleString()}>
          <span>{formatRelativeTime(date)}</span>
        </EuiToolTip>
      ),
    },
  ];

  return isLoading ? (
    <EuiLoadingSpinner size="l" />
  ) : (
    <>
      <EuiBasicTable
        items={historyData?.history ?? []}
        columns={columns}
        tableCaption={i18n.translate('xpack.streams.memory.history.tableCaption', {
          defaultMessage: 'Version history',
        })}
        rowProps={(record) => ({
          onClick: () =>
            setSelectedVersion(selectedVersion === record.version ? null : record.version),
          style: {
            cursor: 'pointer',
            ...(selectedVersion === record.version
              ? { backgroundColor: selectedRowBackground }
              : {}),
          },
        })}
        data-test-subj="streamsMemoryHistoryTable"
      />
      {selectedVersion !== null && selectedRecord && (
        <>
          <EuiSpacer size="m" />
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.streams.memory.history.diffTitle', {
                defaultMessage: 'Changes in version {version}',
                values: { version: selectedVersion },
              })}
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <MemoryDiffViewer
            originalContent={previousRecord?.content ?? ''}
            modifiedContent={selectedRecord.content}
          />
        </>
      )}
    </>
  );
}

function ChangeFlyout({
  change,
  onClose,
  onViewEntry,
}: {
  change: MemoryVersionRecord;
  onClose: () => void;
  onViewEntry: (id: string) => void;
}) {
  const needsPreviousVersion = change.change_type !== 'delete' && change.version > 1;
  const { data: previousVersionData, isLoading: isPrevLoading } = useMemoryVersion(
    needsPreviousVersion ? change.entry_id : undefined,
    needsPreviousVersion ? change.version - 1 : undefined
  );

  const originalContent =
    change.change_type === 'delete' ? change.content : previousVersionData?.content ?? '';
  const modifiedContent = change.change_type === 'delete' ? '' : change.content;
  const isLoading = needsPreviousVersion && isPrevLoading;

  return (
    <EuiFlyout
      onClose={onClose}
      size="m"
      data-test-subj="streamsMemoryChangeFlyout"
      aria-label={i18n.translate('xpack.streams.memory.changeFlyoutAriaLabel', {
        defaultMessage: 'Memory change detail',
      })}
    >
      <EuiFlyoutHeader hasBorder={false}>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiBadge
              color={changeTypeColors[change.change_type] ?? 'default'}
              iconType={changeTypeIcons[change.change_type] ?? 'dot'}
            >
              {change.change_type}
            </EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2>{change.title}</h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xs" />
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.streams.memory.changeMeta', {
            defaultMessage: 'v{version} · {date} · {author}',
            values: {
              version: change.version,
              date: new Date(change.created_at).toLocaleString(),
              author: change.created_by,
            },
          })}
        </EuiText>
        {change.change_summary && (
          <>
            <EuiSpacer size="xs" />
            <EuiText size="s" color="subdued">
              {change.change_summary}
            </EuiText>
          </>
        )}
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {isLoading ? (
          <EuiLoadingSpinner size="l" />
        ) : (
          <MemoryDiffViewer originalContent={originalContent} modifiedContent={modifiedContent} />
        )}
      </EuiFlyoutBody>

      {change.change_type !== 'delete' && (
        <EuiFlyoutFooter>
          <EuiButtonEmpty
            iconType="eye"
            onClick={() => {
              onClose();
              onViewEntry(change.entry_id);
            }}
            data-test-subj="streamsMemoryChangeFlyoutViewCurrentPage"
          >
            {i18n.translate('xpack.streams.memory.viewCurrentPage', {
              defaultMessage: 'View current page',
            })}
          </EuiButtonEmpty>
        </EuiFlyoutFooter>
      )}
    </EuiFlyout>
  );
}

function MemoryDiffViewer({
  originalContent,
  modifiedContent,
}: {
  originalContent: string;
  modifiedContent: string;
}) {
  const { euiTheme } = useEuiTheme();
  const changes = diffLines(originalContent, modifiedContent);

  return (
    <div
      data-test-subj="streamsMemoryDiffViewer"
      className={css`
        font-family: ${euiTheme.font.familyCode};
        font-size: 12px;
        line-height: 1.6;
        overflow: auto;
      `}
    >
      {changes.map((part, partIdx) => {
        const background = part.added
          ? euiTheme.colors.backgroundBaseSuccess
          : part.removed
          ? euiTheme.colors.backgroundBaseDanger
          : 'transparent';
        const prefix = part.added ? '+' : part.removed ? '-' : ' ';
        const prefixColor = part.added
          ? euiTheme.colors.textSuccess
          : part.removed
          ? euiTheme.colors.textDanger
          : euiTheme.colors.textSubdued;
        const lines = part.value.split('\n');
        if (lines[lines.length - 1] === '') lines.pop();
        return lines.map((line, lineIdx) => (
          <div
            key={`${partIdx}-${lineIdx}`}
            className={css`
              display: flex;
              gap: 8px;
              padding: 0 8px;
              background-color: ${background};
              white-space: pre-wrap;
              word-break: break-word;
            `}
          >
            <span
              className={css`
                flex-shrink: 0;
                width: 10px;
                color: ${prefixColor};
                user-select: none;
              `}
            >
              {prefix}
            </span>
            <span>{line}</span>
          </div>
        ));
      })}
    </div>
  );
}

const changeTypeIcons: Record<string, string> = {
  create: 'plusInCircle',
  update: 'pencil',
  delete: 'trash',
  rename: 'sortRight',
};

const changeTypeColors: Record<string, 'success' | 'primary' | 'danger' | 'warning'> = {
  create: 'success',
  update: 'primary',
  delete: 'danger',
  rename: 'warning',
};

const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) {
    return i18n.translate('xpack.streams.memory.relativeTime.justNow', {
      defaultMessage: 'just now',
    });
  }
  if (diffMinutes < 60) {
    return i18n.translate('xpack.streams.memory.relativeTime.minutesAgo', {
      defaultMessage: '{minutes}m ago',
      values: { minutes: diffMinutes },
    });
  }
  if (diffHours < 24) {
    return i18n.translate('xpack.streams.memory.relativeTime.hoursAgo', {
      defaultMessage: '{hours}h ago',
      values: { hours: diffHours },
    });
  }
  if (diffDays < 7) {
    return i18n.translate('xpack.streams.memory.relativeTime.daysAgo', {
      defaultMessage: '{days}d ago',
      values: { days: diffDays },
    });
  }
  return date.toLocaleDateString();
};

function RecentChangeItem({
  change,
  onClick,
}: {
  change: MemoryVersionRecord;
  onClick: () => void;
}) {
  const { euiTheme } = useEuiTheme();
  const hoverBackground = transparentize(euiTheme.colors.primary, 0.05);

  return (
    <EuiPanel
      paddingSize="s"
      hasBorder
      hasShadow={false}
      onClick={onClick}
      className={css`
        cursor: pointer;
        &:hover {
          background-color: ${hoverBackground};
        }
      `}
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiBadge
            color={changeTypeColors[change.change_type] ?? 'default'}
            iconType={changeTypeIcons[change.change_type] ?? 'dot'}
          >
            {change.change_type}
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs">
            <strong>{change.title}</strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {formatRelativeTime(change.created_at)}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem>
          {change.change_summary && (
            <EuiText size="xs" color="subdued">
              {change.change_summary}
            </EuiText>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {change.created_by}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

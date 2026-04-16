/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTabs,
  EuiTab,
  EuiFormRow,
  EuiFieldText,
  EuiTextArea,
  EuiStat,
  EuiBasicTable,
  EuiButtonEmpty,
  EuiButton,
  EuiSpacer,
  EuiText,
  EuiCode,
  EuiDescriptionList,
  EuiLoadingSpinner,
  EuiEmptyPrompt,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { MemoryNode } from '@kbn/agent-builder-common';
import { MemoryTypeBadge, MemoryStatusBadge } from './memory_type_badge';
import {
  useMemoryGet,
  useMemoryUpdate,
  useMemoryDelete,
  useMemoryGraph,
} from '../../hooks/memory/use_memory_list';

type TabId = 'details' | 'graph' | 'sources';

interface MemoryDetailFlyoutProps {
  memoryId: string;
  onClose: () => void;
  onOpenMemory?: (id: string) => void;
}

const tabLabels = {
  details: i18n.translate('xpack.agentBuilder.memory.detail.tab.details', {
    defaultMessage: 'Details',
  }),
  graph: i18n.translate('xpack.agentBuilder.memory.detail.tab.graph', {
    defaultMessage: 'Graph',
  }),
  sources: i18n.translate('xpack.agentBuilder.memory.detail.tab.sources', {
    defaultMessage: 'Sources',
  }),
};

export const MemoryDetailFlyout: React.FC<MemoryDetailFlyoutProps> = ({
  memoryId,
  onClose,
  onOpenMemory,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('details');
  const [isEditing, setIsEditing] = useState(false);
  const [editSummary, setEditSummary] = useState('');
  const [editFull, setEditFull] = useState('');

  const { data: memory, isLoading } = useMemoryGet(memoryId);
  const { data: graphData, isLoading: isGraphLoading } = useMemoryGraph(
    activeTab === 'graph' ? memoryId : undefined
  );
  const { mutate: updateMemory, isLoading: isUpdating } = useMemoryUpdate({
    onSuccess: () => setIsEditing(false),
  });
  const { mutate: deleteMemory, isLoading: isDeleting } = useMemoryDelete({
    onSuccess: onClose,
  });

  const handleStartEdit = useCallback((mem: MemoryNode) => {
    setEditSummary(mem.summary);
    setEditFull(mem.full);
    setIsEditing(true);
  }, []);

  const handleSave = useCallback(() => {
    updateMemory({
      id: memoryId,
      body: { summary: editSummary, full: editFull },
    });
  }, [memoryId, editSummary, editFull, updateMemory]);

  const handleDelete = useCallback(() => {
    deleteMemory(memoryId);
  }, [memoryId, deleteMemory]);

  if (isLoading) {
    return (
      <EuiFlyout onClose={onClose} size="m">
        <EuiFlyoutBody>
          <EuiFlexGroup justifyContent="center" alignItems="center">
            <EuiLoadingSpinner size="l" />
          </EuiFlexGroup>
        </EuiFlyoutBody>
      </EuiFlyout>
    );
  }

  if (!memory) {
    return (
      <EuiFlyout onClose={onClose} size="m">
        <EuiFlyoutBody>
          <EuiEmptyPrompt
            title={
              <h3>
                {i18n.translate('xpack.agentBuilder.memory.detail.notFound', {
                  defaultMessage: 'Memory not found',
                })}
              </h3>
            }
          />
        </EuiFlyoutBody>
      </EuiFlyout>
    );
  }

  const graphColumns = [
    {
      field: 'summary',
      name: i18n.translate('xpack.agentBuilder.memory.detail.graph.summary', {
        defaultMessage: 'Summary',
      }),
      render: (summary: string, node: { id: string; summary: string }) => (
        <EuiButtonEmpty
          size="s"
          onClick={() => onOpenMemory?.(node.id)}
          data-test-subj={`agentBuilderMemoryGraphNodeOpen-${node.id}`}
        >
          {summary}
        </EuiButtonEmpty>
      ),
    },
    {
      field: 'type',
      name: i18n.translate('xpack.agentBuilder.memory.detail.graph.type', {
        defaultMessage: 'Type',
      }),
      width: '100px',
    },
    {
      field: 'weight',
      name: i18n.translate('xpack.agentBuilder.memory.detail.graph.weight', {
        defaultMessage: 'Weight',
      }),
      width: '80px',
      render: (weight: number) => weight?.toFixed(2),
    },
  ];

  const graphItems =
    graphData?.edges.map((edge) => {
      const targetNode = graphData.nodes.find((n) => n.id === edge.target_id);
      return {
        id: edge.target_id,
        summary: targetNode?.summary ?? edge.target_id,
        type: edge.type,
        weight: edge.weight,
      };
    }) ?? [];

  return (
    <EuiFlyout
      onClose={onClose}
      size="m"
      maxWidth={620}
      data-test-subj="agentBuilderMemoryDetailFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="s" wrap>
          <EuiFlexItem grow={false}>
            <MemoryTypeBadge type={memory.type} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <MemoryStatusBadge status={memory.status} />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xs" />
        <EuiTitle size="s">
          <h2>{memory.summary}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiTabs>
          {(['details', 'graph', 'sources'] as TabId[]).map((tabId) => (
            <EuiTab
              key={tabId}
              isSelected={activeTab === tabId}
              onClick={() => setActiveTab(tabId)}
              data-test-subj={`agentBuilderMemoryDetailTab-${tabId}`}
            >
              {tabLabels[tabId]}
            </EuiTab>
          ))}
        </EuiTabs>

        <EuiSpacer size="m" />

        {activeTab === 'details' && (
          <>
            {isEditing ? (
              <>
                <EuiFormRow
                  label={i18n.translate('xpack.agentBuilder.memory.detail.summaryLabel', {
                    defaultMessage: 'Summary',
                  })}
                  fullWidth
                >
                  <EuiFieldText
                    value={editSummary}
                    onChange={(e) => setEditSummary(e.target.value)}
                    fullWidth
                    data-test-subj="agentBuilderMemoryDetailSummaryEdit"
                  />
                </EuiFormRow>
                <EuiFormRow
                  label={i18n.translate('xpack.agentBuilder.memory.detail.fullLabel', {
                    defaultMessage: 'Full content',
                  })}
                  fullWidth
                >
                  <EuiTextArea
                    value={editFull}
                    onChange={(e) => setEditFull(e.target.value)}
                    rows={6}
                    fullWidth
                    data-test-subj="agentBuilderMemoryDetailFullEdit"
                  />
                </EuiFormRow>
              </>
            ) : (
              <>
                <EuiDescriptionList
                  listItems={[
                    {
                      title: i18n.translate('xpack.agentBuilder.memory.detail.summaryLabel', {
                        defaultMessage: 'Summary',
                      }),
                      description: memory.summary,
                    },
                    {
                      title: i18n.translate('xpack.agentBuilder.memory.detail.fullLabel', {
                        defaultMessage: 'Full content',
                      }),
                      description: (
                        <EuiText size="s" style={{ whiteSpace: 'pre-wrap' }}>
                          {memory.full}
                        </EuiText>
                      ),
                    },
                  ]}
                />
                <EuiSpacer size="m" />

                {memory.params && Object.keys(memory.params).length > 0 && (
                  <>
                    <EuiDescriptionList
                      listItems={[
                        {
                          title: i18n.translate('xpack.agentBuilder.memory.detail.paramsLabel', {
                            defaultMessage: 'Properties',
                          }),
                          description: (
                            <EuiText size="s">
                              <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.85em' }}>
                                {JSON.stringify(memory.params, null, 2)}
                              </pre>
                            </EuiText>
                          ),
                        },
                      ]}
                    />
                    <EuiSpacer size="m" />
                  </>
                )}
              </>
            )}

            <EuiFlexGroup wrap gutterSize="m">
              <EuiFlexItem grow={false}>
                <EuiStat
                  title={memory.confidence.toFixed(2)}
                  description={i18n.translate('xpack.agentBuilder.memory.detail.confidence', {
                    defaultMessage: 'Confidence',
                  })}
                  titleSize="s"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiStat
                  title={memory.salience.toFixed(2)}
                  description={i18n.translate('xpack.agentBuilder.memory.detail.salience', {
                    defaultMessage: 'Salience',
                  })}
                  titleSize="s"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiStat
                  title={memory.utility.toFixed(2)}
                  description={i18n.translate('xpack.agentBuilder.memory.detail.utility', {
                    defaultMessage: 'Utility',
                  })}
                  titleSize="s"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiStat
                  title={memory.stability.toFixed(2)}
                  description={i18n.translate('xpack.agentBuilder.memory.detail.stability', {
                    defaultMessage: 'Stability',
                  })}
                  titleSize="s"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiStat
                  title={memory.reinforcement_score.toFixed(2)}
                  description={i18n.translate('xpack.agentBuilder.memory.detail.reinforcement', {
                    defaultMessage: 'Reinforcement',
                  })}
                  titleSize="s"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiStat
                  title={String(memory.access_count)}
                  description={i18n.translate('xpack.agentBuilder.memory.detail.accessCount', {
                    defaultMessage: 'Access count',
                  })}
                  titleSize="s"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}

        {activeTab === 'graph' && (
          <>
            {isGraphLoading ? (
              <EuiFlexGroup justifyContent="center">
                <EuiLoadingSpinner size="m" />
              </EuiFlexGroup>
            ) : graphItems.length === 0 ? (
              <EuiEmptyPrompt
                title={
                  <h3>
                    {i18n.translate('xpack.agentBuilder.memory.detail.graph.empty', {
                      defaultMessage: 'No linked memories',
                    })}
                  </h3>
                }
                body={
                  <p>
                    {i18n.translate('xpack.agentBuilder.memory.detail.graph.emptyDescription', {
                      defaultMessage: 'This memory has no graph connections to other memories yet.',
                    })}
                  </p>
                }
              />
            ) : (
              <EuiBasicTable
                tableCaption={i18n.translate(
                  'xpack.agentBuilder.memory.detail.graph.tableCaption',
                  { defaultMessage: 'Linked memories' }
                )}
                items={graphItems}
                columns={graphColumns}
                rowProps={(item) => ({
                  'data-test-subj': `agentBuilderMemoryGraphRow-${item.id}`,
                })}
              />
            )}
          </>
        )}

        {activeTab === 'sources' && (
          <>
            {memory.source_refs.length === 0 ? (
              <EuiEmptyPrompt
                title={
                  <h3>
                    {i18n.translate('xpack.agentBuilder.memory.detail.sources.empty', {
                      defaultMessage: 'No source references',
                    })}
                  </h3>
                }
              />
            ) : (
              memory.source_refs.map((ref, index) => (
                <EuiDescriptionList
                  key={index}
                  listItems={[
                    {
                      title: i18n.translate(
                        'xpack.agentBuilder.memory.detail.sources.conversationId',
                        { defaultMessage: 'Conversation ID' }
                      ),
                      description: <EuiCode>{ref.conversation_id}</EuiCode>,
                    },
                    {
                      title: i18n.translate('xpack.agentBuilder.memory.detail.sources.roundId', {
                        defaultMessage: 'Round ID',
                      }),
                      description: <EuiCode>{ref.round_id}</EuiCode>,
                    },
                    ...(ref.message_ids?.length
                      ? [
                          {
                            title: i18n.translate(
                              'xpack.agentBuilder.memory.detail.sources.messageIds',
                              { defaultMessage: 'Message IDs' }
                            ),
                            description: ref.message_ids.join(', '),
                          },
                        ]
                      : []),
                  ]}
                />
              ))
            )}
          </>
        )}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButton
              color="danger"
              iconType="trash"
              onClick={handleDelete}
              isLoading={isDeleting}
              data-test-subj="agentBuilderMemoryDetailDelete"
            >
              {i18n.translate('xpack.agentBuilder.memory.detail.deleteButton', {
                defaultMessage: 'Delete',
              })}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s">
              {isEditing ? (
                <>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      onClick={() => setIsEditing(false)}
                      data-test-subj="agentBuilderMemoryDetailCancelEdit"
                    >
                      {i18n.translate('xpack.agentBuilder.memory.detail.cancelButton', {
                        defaultMessage: 'Cancel',
                      })}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      fill
                      onClick={handleSave}
                      isLoading={isUpdating}
                      data-test-subj="agentBuilderMemoryDetailSave"
                    >
                      {i18n.translate('xpack.agentBuilder.memory.detail.saveButton', {
                        defaultMessage: 'Save',
                      })}
                    </EuiButton>
                  </EuiFlexItem>
                </>
              ) : (
                <>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      onClick={onClose}
                      data-test-subj="agentBuilderMemoryDetailClose"
                    >
                      {i18n.translate('xpack.agentBuilder.memory.detail.closeButton', {
                        defaultMessage: 'Close',
                      })}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      iconType="pencil"
                      onClick={() => handleStartEdit(memory)}
                      data-test-subj="agentBuilderMemoryDetailEdit"
                    >
                      {i18n.translate('xpack.agentBuilder.memory.detail.editButton', {
                        defaultMessage: 'Edit',
                      })}
                    </EuiButton>
                  </EuiFlexItem>
                </>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

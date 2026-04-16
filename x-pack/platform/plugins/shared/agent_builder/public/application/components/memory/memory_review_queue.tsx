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
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { i18n } from '@kbn/i18n';
import { MemoryDetailFlyout } from './memory_detail_flyout';
import { useReviewQueue } from '../../hooks/memory/use_memory_stats';
import { useResolveReview } from '../../hooks/memory/use_review_queue';
import type { MemoryReviewItem } from '../../../services/memory';

export const AgentBuilderMemoryReviewQueue: React.FC = () => {
  const [selectedMemoryId, setSelectedMemoryId] = useState<string | undefined>(undefined);
  const [mergeModalItem, setMergeModalItem] = useState<MemoryReviewItem | undefined>(undefined);
  const [mergeTargetId, setMergeTargetId] = useState('');

  const { items, total, isLoading, refetchQueue } = useReviewQueue(50);
  const { mutate: resolveReview, isLoading: isResolving } = useResolveReview();

  const handleApprove = useCallback(
    (item: MemoryReviewItem) => {
      resolveReview({ id: item.id, action: 'approve' });
    },
    [resolveReview]
  );

  const handleReject = useCallback(
    (item: MemoryReviewItem) => {
      resolveReview({ id: item.id, action: 'reject' });
    },
    [resolveReview]
  );

  const handleMergeConfirm = useCallback(() => {
    if (!mergeModalItem || !mergeTargetId.trim()) return;
    resolveReview({
      id: mergeModalItem.id,
      action: 'merge',
      merge_target_id: mergeTargetId.trim(),
    });
    setMergeModalItem(undefined);
    setMergeTargetId('');
  }, [mergeModalItem, mergeTargetId, resolveReview]);

  const columns = [
    {
      field: 'memory_id',
      name: i18n.translate('xpack.agentBuilder.memory.review.column.memoryId', {
        defaultMessage: 'Memory ID',
      }),
      render: (memoryId: string) => (
        <EuiButtonEmpty
          size="s"
          onClick={() => setSelectedMemoryId(memoryId)}
          data-test-subj={`agentBuilderMemoryReviewRowMemoryId-${memoryId}`}
        >
          <EuiText size="xs" style={{ fontFamily: 'monospace' }}>
            {memoryId}
          </EuiText>
        </EuiButtonEmpty>
      ),
    },
    {
      field: 'reason',
      name: i18n.translate('xpack.agentBuilder.memory.review.column.reason', {
        defaultMessage: 'Reason',
      }),
      width: '150px',
      sortable: true,
    },
    {
      field: 'priority',
      name: i18n.translate('xpack.agentBuilder.memory.review.column.priority', {
        defaultMessage: 'Priority',
      }),
      width: '80px',
      sortable: true,
    },
    {
      field: 'enqueued_at',
      name: i18n.translate('xpack.agentBuilder.memory.review.column.enqueuedAt', {
        defaultMessage: 'Enqueued',
      }),
      width: '150px',
      render: (date: string) => (date ? new Date(date).toLocaleDateString() : '-'),
      sortable: true,
    },
    {
      name: i18n.translate('xpack.agentBuilder.memory.review.column.actions', {
        defaultMessage: 'Actions',
      }),
      width: '120px',
      render: (item: MemoryReviewItem) => (
        <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={i18n.translate('xpack.agentBuilder.memory.review.action.approve', {
                defaultMessage: 'Approve (keep)',
              })}
            >
              <EuiButtonIcon
                iconType="check"
                color="success"
                aria-label={i18n.translate('xpack.agentBuilder.memory.review.action.approve', {
                  defaultMessage: 'Approve (keep)',
                })}
                onClick={() => handleApprove(item)}
                isLoading={isResolving}
                data-test-subj={`agentBuilderMemoryReviewApprove-${item.id}`}
              />
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={i18n.translate('xpack.agentBuilder.memory.review.action.reject', {
                defaultMessage: 'Reject (deprecate)',
              })}
            >
              <EuiButtonIcon
                iconType="cross"
                color="danger"
                aria-label={i18n.translate('xpack.agentBuilder.memory.review.action.reject', {
                  defaultMessage: 'Reject (deprecate)',
                })}
                onClick={() => handleReject(item)}
                isLoading={isResolving}
                data-test-subj={`agentBuilderMemoryReviewReject-${item.id}`}
              />
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={i18n.translate('xpack.agentBuilder.memory.review.action.merge', {
                defaultMessage: 'Merge into another memory',
              })}
            >
              <EuiButtonIcon
                iconType="merge"
                color="warning"
                aria-label={i18n.translate('xpack.agentBuilder.memory.review.action.merge', {
                  defaultMessage: 'Merge into another memory',
                })}
                onClick={() => {
                  setMergeModalItem(item);
                  setMergeTargetId('');
                }}
                data-test-subj={`agentBuilderMemoryReviewMerge-${item.id}`}
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
  ];

  return (
    <>
      <KibanaPageTemplate data-test-subj="agentBuilderMemoryReviewPage">
        <KibanaPageTemplate.Header
          pageTitle={i18n.translate('xpack.agentBuilder.memory.review.pageTitle', {
            defaultMessage: 'Memory Review Queue',
          })}
          description={i18n.translate('xpack.agentBuilder.memory.review.pageDescription', {
            defaultMessage:
              'Memories flagged for human review. Approve to keep, reject to deprecate, or merge with another memory.',
          })}
          css={({ euiTheme }: { euiTheme: { colors: { backgroundBasePlain: string } } }) => ({
            backgroundColor: euiTheme.colors.backgroundBasePlain,
            borderBlockEnd: 'none',
          })}
          rightSideItems={[
            <EuiButton
              key="refresh"
              iconType="refresh"
              onClick={() => refetchQueue()}
              isLoading={isLoading}
              data-test-subj="agentBuilderMemoryReviewRefresh"
            >
              {i18n.translate('xpack.agentBuilder.memory.review.refreshButton', {
                defaultMessage: 'Refresh',
              })}
            </EuiButton>,
          ]}
        />
        <KibanaPageTemplate.Section>
          {isLoading ? (
            <EuiFlexGroup justifyContent="center">
              <EuiLoadingSpinner size="l" />
            </EuiFlexGroup>
          ) : items.length === 0 ? (
            <EuiEmptyPrompt
              iconType="checkInCircleFilled"
              iconColor="success"
              title={
                <h3>
                  {i18n.translate('xpack.agentBuilder.memory.review.emptyTitle', {
                    defaultMessage: 'Review queue is empty',
                  })}
                </h3>
              }
              body={
                <p>
                  {i18n.translate('xpack.agentBuilder.memory.review.emptyDescription', {
                    defaultMessage: 'No memories are awaiting review at this time.',
                  })}
                </p>
              }
              data-test-subj="agentBuilderMemoryReviewEmpty"
            />
          ) : (
            <EuiBasicTable
              tableCaption={i18n.translate('xpack.agentBuilder.memory.review.tableCaption', {
                defaultMessage: 'Review queue: {count} items',
                values: { count: total },
              })}
              items={items}
              itemId="id"
              columns={columns}
              sorting={{ sort: { field: 'priority', direction: 'desc' } }}
              rowProps={(item) => ({
                'data-test-subj': `agentBuilderMemoryReviewRow-${item.id}`,
              })}
              data-test-subj="agentBuilderMemoryReviewTable"
            />
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

      {mergeModalItem && (
        <EuiModal
          onClose={() => {
            setMergeModalItem(undefined);
            setMergeTargetId('');
          }}
          data-test-subj="agentBuilderMemoryMergeModal"
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle>
              {i18n.translate('xpack.agentBuilder.memory.review.mergeModal.title', {
                defaultMessage: 'Merge memory',
              })}
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiText size="s">
              <p>
                {i18n.translate('xpack.agentBuilder.memory.review.mergeModal.description', {
                  defaultMessage:
                    'The reviewed memory will be deprecated and merged into the target memory. Enter the target memory ID below.',
                })}
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiFormRow
              label={i18n.translate('xpack.agentBuilder.memory.review.mergeModal.targetLabel', {
                defaultMessage: 'Target memory ID',
              })}
              fullWidth
            >
              <EuiFieldText
                value={mergeTargetId}
                onChange={(e) => setMergeTargetId(e.target.value)}
                placeholder={i18n.translate(
                  'xpack.agentBuilder.memory.review.mergeModal.targetPlaceholder',
                  { defaultMessage: 'Enter memory ID...' }
                )}
                fullWidth
                data-test-subj="agentBuilderMemoryMergeTargetId"
              />
            </EuiFormRow>
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButtonEmpty
              onClick={() => {
                setMergeModalItem(undefined);
                setMergeTargetId('');
              }}
            >
              {i18n.translate('xpack.agentBuilder.memory.review.mergeModal.cancelButton', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
            <EuiButton
              fill
              color="warning"
              onClick={handleMergeConfirm}
              disabled={!mergeTargetId.trim()}
              isLoading={isResolving}
              data-test-subj="agentBuilderMemoryMergeConfirm"
            >
              {i18n.translate('xpack.agentBuilder.memory.review.mergeModal.confirmButton', {
                defaultMessage: 'Merge',
              })}
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      )}
    </>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { KbnDangerCallout } from '@kbn/ui-callout';
import {
  EuiBadge,
  EuiButton,
  EuiConfirmModal,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedRelative } from '@kbn/i18n-react';
import type { ShortTermMemory, ShortTermMemoryPromotionStatus } from '@kbn/agent-builder-common';
import {
  useAgentMemories,
  useDeleteAgentMemory,
  useDeleteAllAgentMemories,
} from '../../../hooks/memory/use_agent_memories';
import { useToasts } from '../../../hooks/use_toasts';
import { PageWrapper } from '../common/page_wrapper';

const labels = {
  title: i18n.translate('xpack.agentBuilder.agentMemory.title', { defaultMessage: 'Memory' }),
  description: i18n.translate('xpack.agentBuilder.agentMemory.description', {
    defaultMessage:
      'What this agent remembers about working with you. These memories are private to you and this agent. Automations may promote generally useful ones, rewritten without personal details, into shared long-term memory.',
  }),
  forgetAll: i18n.translate('xpack.agentBuilder.agentMemory.forgetAll', {
    defaultMessage: 'Forget all',
  }),
  forget: i18n.translate('xpack.agentBuilder.agentMemory.forget', { defaultMessage: 'Forget' }),
  forgetDescription: i18n.translate('xpack.agentBuilder.agentMemory.forgetDescription', {
    defaultMessage: 'Permanently delete this memory',
  }),
  emptyTitle: i18n.translate('xpack.agentBuilder.agentMemory.emptyTitle', {
    defaultMessage: 'No memories yet',
  }),
  emptyBody: i18n.translate('xpack.agentBuilder.agentMemory.emptyBody', {
    defaultMessage:
      'The agent records preferences, corrections and facts about your environment as you work together.',
  }),
  loadError: i18n.translate('xpack.agentBuilder.agentMemory.loadError', {
    defaultMessage: 'Could not load memories',
  }),
  tableCaption: i18n.translate('xpack.agentBuilder.agentMemory.tableCaption', {
    defaultMessage: 'Your short-term memories with this agent',
  }),
  confirmTitle: i18n.translate('xpack.agentBuilder.agentMemory.confirmTitle', {
    defaultMessage: 'Forget all memories with this agent?',
  }),
  confirmBody: i18n.translate('xpack.agentBuilder.agentMemory.confirmBody', {
    defaultMessage:
      'This permanently deletes your short-term memories with this agent. Memories already promoted into long-term memory are not affected.',
  }),
  cancel: i18n.translate('xpack.agentBuilder.agentMemory.cancel', { defaultMessage: 'Cancel' }),
  deleteError: i18n.translate('xpack.agentBuilder.agentMemory.deleteError', {
    defaultMessage: 'Could not delete memory',
  }),
  columns: {
    title: i18n.translate('xpack.agentBuilder.agentMemory.columns.title', {
      defaultMessage: 'Memory',
    }),
    type: i18n.translate('xpack.agentBuilder.agentMemory.columns.type', {
      defaultMessage: 'Type',
    }),
    promotion: i18n.translate('xpack.agentBuilder.agentMemory.columns.promotion', {
      defaultMessage: 'Long-term memory',
    }),
    updated: i18n.translate('xpack.agentBuilder.agentMemory.columns.updated', {
      defaultMessage: 'Updated',
    }),
    expires: i18n.translate('xpack.agentBuilder.agentMemory.columns.expires', {
      defaultMessage: 'Expires',
    }),
    actions: i18n.translate('xpack.agentBuilder.agentMemory.columns.actions', {
      defaultMessage: 'Actions',
    }),
  },
  never: i18n.translate('xpack.agentBuilder.agentMemory.never', { defaultMessage: 'Never' }),
  typeFact: i18n.translate('xpack.agentBuilder.agentMemory.typeFact', { defaultMessage: 'Fact' }),
  typeSession: i18n.translate('xpack.agentBuilder.agentMemory.typeSession', {
    defaultMessage: 'Session summary',
  }),
  promotion: {
    pending: i18n.translate('xpack.agentBuilder.agentMemory.promotion.pending', {
      defaultMessage: 'Not reviewed',
    }),
    promoted: i18n.translate('xpack.agentBuilder.agentMemory.promotion.promoted', {
      defaultMessage: 'Promoted',
    }),
    rejected: i18n.translate('xpack.agentBuilder.agentMemory.promotion.rejected', {
      defaultMessage: 'Kept private',
    }),
  } satisfies Record<ShortTermMemoryPromotionStatus, string>,
};

const PROMOTION_BADGE_COLOR: Record<ShortTermMemoryPromotionStatus, string> = {
  pending: 'hollow',
  promoted: 'success',
  rejected: 'default',
};

export const AgentMemory = ({ agentId }: { agentId: string }) => {
  const { addSuccessToast, addErrorToast } = useToasts();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const confirmTitleId = useGeneratedHtmlId();
  const { memories, isLoading, error } = useAgentMemories({ agentId });

  const { deleteMemory, isDeleting } = useDeleteAgentMemory({
    agentId,
    onError: (deleteError) =>
      addErrorToast({ title: labels.deleteError, text: deleteError.message }),
  });
  const { deleteAllMemories, isDeletingAll } = useDeleteAllAgentMemories({
    agentId,
    onSuccess: (deleted) =>
      addSuccessToast({
        title: i18n.translate('xpack.agentBuilder.agentMemory.forgotAll', {
          defaultMessage: 'Forgot {deleted, plural, one {# memory} other {# memories}}',
          values: { deleted },
        }),
      }),
    onError: (deleteError) =>
      addErrorToast({ title: labels.deleteError, text: deleteError.message }),
  });

  const columns = useMemo<Array<EuiBasicTableColumn<ShortTermMemory>>>(
    () => [
      {
        field: 'title',
        name: labels.columns.title,
        render: (_title: string, memory: ShortTermMemory) => (
          <div>
            <EuiText size="s">
              <strong>{memory.title}</strong>
            </EuiText>
            <EuiText size="xs" color="subdued">
              {memory.description}
            </EuiText>
          </div>
        ),
      },
      {
        field: 'type',
        name: labels.columns.type,
        width: '140px',
        render: (type: ShortTermMemory['type']) =>
          type === 'memory.session' ? labels.typeSession : labels.typeFact,
      },
      {
        field: 'promotion',
        name: labels.columns.promotion,
        width: '150px',
        render: (promotion: ShortTermMemory['promotion']) => (
          <EuiToolTip content={promotion.reason}>
            <EuiBadge color={PROMOTION_BADGE_COLOR[promotion.status]} tabIndex={0}>
              {labels.promotion[promotion.status]}
            </EuiBadge>
          </EuiToolTip>
        ),
      },
      {
        field: 'updated_at',
        name: labels.columns.updated,
        width: '140px',
        sortable: true,
        render: (updatedAt: string) => <FormattedRelative value={new Date(updatedAt)} />,
      },
      {
        field: 'expires_at',
        name: labels.columns.expires,
        width: '140px',
        render: (expiresAt?: string) =>
          expiresAt ? <FormattedRelative value={new Date(expiresAt)} /> : labels.never,
      },
      {
        name: labels.columns.actions,
        width: '80px',
        actions: [
          {
            name: labels.forget,
            description: labels.forgetDescription,
            icon: 'trash',
            color: 'danger',
            type: 'icon',
            enabled: () => !isDeleting,
            onClick: (memory: ShortTermMemory) => deleteMemory(memory.id),
            'data-test-subj': 'agentBuilderMemoryForget',
          },
        ],
      },
    ],
    [deleteMemory, isDeleting]
  );

  return (
    <PageWrapper>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="l">
            <h1>{labels.title}</h1>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            color="danger"
            iconType="trash"
            isDisabled={memories.length === 0}
            isLoading={isDeletingAll}
            onClick={() => setIsConfirmOpen(true)}
            data-test-subj="agentBuilderMemoryForgetAll"
          >
            {labels.forgetAll}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>{labels.description}</p>
      </EuiText>
      <EuiSpacer size="l" />
      {error ? (
        <KbnDangerCallout
          announceOnMount
          title={labels.loadError}
          text={<p>{error instanceof Error ? error.message : String(error)}</p>}
          data-test-subj="agentBuilderMemoryLoadError"
        />
      ) : (
        <EuiInMemoryTable<ShortTermMemory>
          tableCaption={labels.tableCaption}
          items={memories}
          columns={columns}
          loading={isLoading}
          itemId="id"
          pagination={{ initialPageSize: 20, pageSizeOptions: [20, 50, 100] }}
          sorting={{ sort: { field: 'updated_at', direction: 'desc' } }}
          noItemsMessage={
            isLoading ? undefined : (
              <EuiEmptyPrompt
                iconType="memory"
                title={<h2>{labels.emptyTitle}</h2>}
                body={<p>{labels.emptyBody}</p>}
              />
            )
          }
          data-test-subj="agentBuilderMemoryTable"
        />
      )}
      {isConfirmOpen && (
        <EuiConfirmModal
          aria-labelledby={confirmTitleId}
          titleProps={{ id: confirmTitleId }}
          title={labels.confirmTitle}
          onCancel={() => setIsConfirmOpen(false)}
          onConfirm={() => {
            setIsConfirmOpen(false);
            deleteAllMemories();
          }}
          cancelButtonText={labels.cancel}
          confirmButtonText={labels.forgetAll}
          buttonColor="danger"
          defaultFocusedButton="cancel"
        >
          <p>{labels.confirmBody}</p>
        </EuiConfirmModal>
      )}
    </PageWrapper>
  );
};

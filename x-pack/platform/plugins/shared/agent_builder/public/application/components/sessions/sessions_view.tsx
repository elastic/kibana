/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPageHeader,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EuiBasicTableColumn } from '@elastic/eui';
import type { ConversationWithoutRounds, StandingSessionStatus } from '@kbn/agent-builder-common';
import { useQueryClient } from '@kbn/react-query';
import { useSessionList } from '../../hooks/use_session_list';
import { useAgentBuilderServices } from '../../hooks/use_agent_builder_service';
import { useNavigation } from '../../hooks/use_navigation';
import { queryKeys } from '../../query_keys';
import { appPaths } from '../../utils/app_paths';
import { SessionStatusBadge } from './session_status_badge';

const labels = {
  title: i18n.translate('xpack.agentBuilder.sessions.view.title', {
    defaultMessage: 'Bots',
  }),
  newSession: i18n.translate('xpack.agentBuilder.sessions.view.newSession', {
    defaultMessage: 'New bot',
  }),
  columnName: i18n.translate('xpack.agentBuilder.sessions.view.column.name', {
    defaultMessage: 'Name',
  }),
  columnStatus: i18n.translate('xpack.agentBuilder.sessions.view.column.status', {
    defaultMessage: 'Status',
  }),
  columnSubscriptions: i18n.translate('xpack.agentBuilder.sessions.view.column.subscriptions', {
    defaultMessage: 'Subscriptions',
  }),
  columnLastActive: i18n.translate('xpack.agentBuilder.sessions.view.column.lastActive', {
    defaultMessage: 'Last active',
  }),
  columnActions: i18n.translate('xpack.agentBuilder.sessions.view.column.actions', {
    defaultMessage: 'Actions',
  }),
  openAction: i18n.translate('xpack.agentBuilder.sessions.view.action.open', {
    defaultMessage: 'Open',
  }),
  terminateAction: i18n.translate('xpack.agentBuilder.sessions.view.action.terminate', {
    defaultMessage: 'Terminate',
  }),
  emptyState: i18n.translate('xpack.agentBuilder.sessions.view.emptyState', {
    defaultMessage: 'No bots yet. Create one to get started.',
  }),
  modalTitle: i18n.translate('xpack.agentBuilder.sessions.view.modal.title', {
    defaultMessage: 'New bot',
  }),
  modalNameLabel: i18n.translate('xpack.agentBuilder.sessions.view.modal.nameLabel', {
    defaultMessage: 'Name',
  }),
  modalCancelButton: i18n.translate('xpack.agentBuilder.sessions.view.modal.cancel', {
    defaultMessage: 'Cancel',
  }),
  modalCreateButton: i18n.translate('xpack.agentBuilder.sessions.view.modal.create', {
    defaultMessage: 'Create',
  }),
};

export const AgentBuilderSessionsView: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const { sessions = [], isLoading } = useSessionList({ agentId });
  const { sessionsService } = useAgentBuilderServices();
  const { navigateToAgentBuilderUrl } = useNavigation();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const modalTitleId = useGeneratedHtmlId({ prefix: 'newSessionModal' });

  const handleTerminate = useCallback(
    async (sessionId: string) => {
      await sessionsService.terminate(sessionId);
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.byAgent(agentId) });
    },
    [sessionsService, queryClient, agentId]
  );

  const handleCreate = useCallback(async () => {
    if (!newSessionName.trim()) return;
    setIsCreating(true);
    try {
      await sessionsService.create({ agent_id: agentId, name: newSessionName.trim() });
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.byAgent(agentId) });
      setIsModalOpen(false);
      setNewSessionName('');
    } finally {
      setIsCreating(false);
    }
  }, [sessionsService, queryClient, agentId, newSessionName]);

  const columns: Array<EuiBasicTableColumn<ConversationWithoutRounds>> = [
    {
      field: 'title',
      name: labels.columnName,
      truncateText: true,
    },
    {
      name: labels.columnStatus,
      render: (session: ConversationWithoutRounds) => {
        const status = session.state?.standing_session?.status as StandingSessionStatus | undefined;
        return status ? <SessionStatusBadge status={status} /> : null;
      },
    },
    {
      name: labels.columnSubscriptions,
      render: (session: ConversationWithoutRounds) => {
        const count = session.state?.standing_session?.trigger_subscriptions?.length ?? 0;
        return <EuiText size="s">{count}</EuiText>;
      },
    },
    {
      name: labels.columnLastActive,
      render: (session: ConversationWithoutRounds) => {
        const lastActiveAt = session.state?.standing_session?.last_active_at;
        return (
          <EuiText size="s">{lastActiveAt ? new Date(lastActiveAt).toLocaleString() : '—'}</EuiText>
        );
      },
    },
    {
      name: labels.columnActions,
      actions: [
        {
          name: labels.openAction,
          description: labels.openAction,
          type: 'button',
          onClick: (session: ConversationWithoutRounds) => {
            navigateToAgentBuilderUrl(
              appPaths.agent.sessions.byId({ agentId, sessionId: session.id })
            );
          },
        },
        {
          name: labels.terminateAction,
          description: labels.terminateAction,
          type: 'button',
          color: 'danger',
          available: (session: ConversationWithoutRounds) =>
            session.state?.standing_session?.status !== 'terminated',
          onClick: (session: ConversationWithoutRounds) => {
            handleTerminate(session.id);
          },
        },
      ],
    },
  ];

  return (
    <>
      <EuiPageHeader
        pageTitle={labels.title}
        rightSideItems={[
          <EuiButton
            key="new-session"
            iconType="plus"
            onClick={() => setIsModalOpen(true)}
            data-test-subj="agentBuilderSessionsNewButton"
          >
            {labels.newSession}
          </EuiButton>,
        ]}
      />
      <EuiSpacer size="m" />
      <EuiBasicTable
        items={sessions}
        columns={columns}
        loading={isLoading}
        noItemsMessage={labels.emptyState}
        data-test-subj="agentBuilderSessionsTable"
      />

      {isModalOpen && (
        <EuiModal onClose={() => setIsModalOpen(false)} aria-labelledby={modalTitleId}>
          <EuiModalHeader>
            <EuiModalHeaderTitle id={modalTitleId}>{labels.modalTitle}</EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiForm>
              <EuiFormRow label={labels.modalNameLabel}>
                <EuiFieldText
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  data-test-subj="agentBuilderSessionsModalNameInput"
                  autoFocus
                />
              </EuiFormRow>
            </EuiForm>
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButtonEmpty onClick={() => setIsModalOpen(false)}>
              {labels.modalCancelButton}
            </EuiButtonEmpty>
            <EuiButton
              fill
              onClick={handleCreate}
              isLoading={isCreating}
              isDisabled={!newSessionName.trim()}
              data-test-subj="agentBuilderSessionsModalCreateButton"
            >
              {labels.modalCreateButton}
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      )}
    </>
  );
};

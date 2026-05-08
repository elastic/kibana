/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useQueryClient } from '@kbn/react-query';
import { useSession } from '../../hooks/use_session';
import { AgentBuilderConversationsView } from '../conversations/conversations_view';
import { SessionStatusBadge } from './session_status_badge';
import { useAgentBuilderServices } from '../../hooks/use_agent_builder_service';
import { queryKeys } from '../../query_keys';

const labels = {
  bot: i18n.translate('xpack.agentBuilder.sessionDetail.standingSessionLabel', {
    defaultMessage: 'Bot',
  }),
  subscriptions: (count: number) =>
    i18n.translate('xpack.agentBuilder.sessionDetail.subscriptionsLabel', {
      defaultMessage: '{count} subscription(s)',
      values: { count },
    }),
  terminate: i18n.translate('xpack.agentBuilder.sessionDetail.terminateLabel', {
    defaultMessage: 'Terminate',
  }),
  processing: i18n.translate('xpack.agentBuilder.sessionDetail.processingLabel', {
    defaultMessage: 'Processing — messages you send now will be queued',
  }),
};

export const AgentBuilderSessionDetailView: React.FC = () => {
  const { conversationId, agentId } = useParams<{ conversationId: string; agentId: string }>();
  const { session } = useSession(conversationId);
  const { sessionsService } = useAgentBuilderServices();
  const queryClient = useQueryClient();
  const standingSession = session?.state?.standing_session;
  const isActive = standingSession?.status === 'active';

  const handleTerminate = async () => {
    if (!conversationId) return;
    await sessionsService.terminate(conversationId);
    queryClient.invalidateQueries({ queryKey: queryKeys.sessions.byAgent(agentId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.sessions.byId(conversationId) });
  };

  const calloutColor =
    standingSession?.status === 'terminated' ? 'danger' : isActive ? 'success' : 'primary';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {standingSession && (
        <EuiCallOut
          size="s"
          color={calloutColor}
          iconType={isActive ? 'empty' : 'clock'}
          title={
            <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <strong>{labels.bot}</strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <SessionStatusBadge status={standingSession.status} />
              </EuiFlexItem>
              {isActive && (
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiLoadingSpinner size="s" />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText size="s" color="subdued">
                        {labels.processing}
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              )}
              {!isActive && (
                <EuiFlexItem grow={false}>
                  <EuiText size="s" color="subdued">
                    {labels.subscriptions(standingSession.trigger_subscriptions.length)}
                  </EuiText>
                </EuiFlexItem>
              )}
              {standingSession.status !== 'terminated' && (
                <EuiFlexItem grow={false}>
                  <EuiButton size="s" color="danger" onClick={handleTerminate}>
                    {labels.terminate}
                  </EuiButton>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          }
        />
      )}
      <div style={{ flex: 1, minHeight: 0 }}>
        <AgentBuilderConversationsView />
      </div>
    </div>
  );
};

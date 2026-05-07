/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { EuiButton, EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useQueryClient } from '@kbn/react-query';
import { useSession } from '../../hooks/use_session';
import { AgentBuilderConversationsView } from '../conversations/conversations_view';
import { SessionStatusBadge } from './session_status_badge';
import { useAgentBuilderServices } from '../../hooks/use_agent_builder_service';
import { queryKeys } from '../../query_keys';

const standingSessionLabel = i18n.translate(
  'xpack.agentBuilder.sessionDetail.standingSessionLabel',
  { defaultMessage: 'Bot' }
);

const subscriptionsLabel = (count: number) =>
  i18n.translate('xpack.agentBuilder.sessionDetail.subscriptionsLabel', {
    defaultMessage: '{count} subscription(s)',
    values: { count },
  });

const terminateLabel = i18n.translate('xpack.agentBuilder.sessionDetail.terminateLabel', {
  defaultMessage: 'Terminate',
});

export const AgentBuilderSessionDetailView: React.FC = () => {
  const { conversationId, agentId } = useParams<{ conversationId: string; agentId: string }>();
  const { session } = useSession(conversationId);
  const { sessionsService } = useAgentBuilderServices();
  const queryClient = useQueryClient();
  const standingSession = session?.state?.standing_session;

  const handleTerminate = async () => {
    if (!conversationId) return;
    await sessionsService.terminate(conversationId);
    queryClient.invalidateQueries({ queryKey: queryKeys.sessions.byAgent(agentId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.sessions.byId(conversationId) });
  };

  const calloutColor =
    standingSession?.status === 'terminated'
      ? 'danger'
      : standingSession?.status === 'active'
      ? 'success'
      : 'primary';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {standingSession && (
        <EuiCallOut
          size="s"
          color={calloutColor}
          iconType="clock"
          title={
            <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <strong>{standingSessionLabel}</strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <SessionStatusBadge status={standingSession.status} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  {subscriptionsLabel(standingSession.trigger_subscriptions.length)}
                </EuiText>
              </EuiFlexItem>
              {standingSession.status !== 'terminated' && (
                <EuiFlexItem grow={false}>
                  <EuiButton size="s" color="danger" onClick={handleTerminate}>
                    {terminateLabel}
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

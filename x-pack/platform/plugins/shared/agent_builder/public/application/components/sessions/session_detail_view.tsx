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
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useQueryClient } from '@kbn/react-query';
import { ConversationRoundStepType } from '@kbn/agent-builder-common';
import { useSession } from '../../hooks/use_session';
import { useFollowExecution } from '../../hooks/use_follow_execution';
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
  liveTitle: i18n.translate('xpack.agentBuilder.sessionDetail.liveTitle', {
    defaultMessage: 'Live activity',
  }),
  thinking: i18n.translate('xpack.agentBuilder.sessionDetail.thinking', {
    defaultMessage: 'Thinking…',
  }),
};

// ---------------------------------------------------------------------------
// Live activity panel — attaches to the running round via useFollowExecution
// ---------------------------------------------------------------------------

const LiveActivityPanel: React.FC<{ executionId: string }> = ({ executionId }) => {
  const { euiTheme } = useEuiTheme();
  const { steps, streamingMessage, isLoading } = useFollowExecution(executionId);

  const panelCss = css`
    border-left: 3px solid ${euiTheme.colors.success};
    background: ${euiTheme.colors.backgroundBaseSuccess};
    padding: ${euiTheme.size.m};
    overflow-y: auto;
    max-height: 280px;
  `;

  const toolCallSteps = steps.filter((s) => s.type === ConversationRoundStepType.toolCall);

  return (
    <div css={panelCss}>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="s" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxxs">
            <span>{labels.liveTitle}</span>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>

      {toolCallSteps.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
            {toolCallSteps.map((step, i) => {
              if (step.type !== ConversationRoundStepType.toolCall) return null;
              return (
                <EuiFlexItem grow={false} key={i}>
                  <EuiText size="xs" color="subdued">
                    <EuiCode>{step.tool_id}</EuiCode>
                  </EuiText>
                </EuiFlexItem>
              );
            })}
          </EuiFlexGroup>
        </>
      )}

      {(streamingMessage || (isLoading && toolCallSteps.length === 0)) && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="s">
            {streamingMessage || (
              <span style={{ color: euiTheme.colors.textSubdued, fontStyle: 'italic' }}>
                {labels.thinking}
              </span>
            )}
          </EuiText>
        </>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export const AgentBuilderSessionDetailView: React.FC = () => {
  const { conversationId, agentId } = useParams<{ conversationId: string; agentId: string }>();
  const { session } = useSession(conversationId);
  const { sessionsService } = useAgentBuilderServices();
  const queryClient = useQueryClient();
  const standingSession = session?.state?.standing_session;
  const isActive = standingSession?.status === 'active';
  const activeExecutionId = standingSession?.active_execution_id ?? null;

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

      {isActive && activeExecutionId && (
        <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none">
          <LiveActivityPanel executionId={activeExecutionId} />
        </EuiPanel>
      )}

      <div style={{ flex: 1, minHeight: 0 }}>
        <AgentBuilderConversationsView />
      </div>
    </div>
  );
};

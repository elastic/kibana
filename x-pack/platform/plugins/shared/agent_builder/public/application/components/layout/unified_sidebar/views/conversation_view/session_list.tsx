/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom-v5-compat';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { StandingSessionStatus } from '@kbn/agent-builder-common';
import { useSessionList } from '../../../../../hooks/use_session_list';
import { appPaths } from '../../../../../utils/app_paths';
import {
  createConversationListItemStyles,
  createActiveConversationListItemStyles,
} from '../../../../conversations/conversation_list_item_styles';

const noSessionsLabel = i18n.translate('xpack.agentBuilder.sidebar.sessionList.noSessions', {
  defaultMessage: 'No bots',
});

const statusDotColors: Record<StandingSessionStatus, string> = {
  active: '#00bfb3',
  idle: '#c2c2c2',
  terminated: '#bd271e',
};

interface SessionListProps {
  agentId: string;
  currentSessionId: string | undefined;
}

export const SessionList: React.FC<SessionListProps> = ({ agentId, currentSessionId }) => {
  const { euiTheme } = useEuiTheme();
  const { sessions = [], isLoading } = useSessionList({ agentId });

  const sortedSessions = useMemo(
    () =>
      [...sessions].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      ),
    [sessions]
  );

  const linkStyles = createConversationListItemStyles(euiTheme);
  const activeLinkStyles = createActiveConversationListItemStyles(euiTheme);

  if (isLoading) {
    return (
      <EuiFlexGroup direction="column" gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="s" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (sortedSessions.length === 0) {
    return (
      <EuiText size="xs" color="subdued">
        {noSessionsLabel}
      </EuiText>
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      {sortedSessions.map((session) => {
        const isActive = currentSessionId === session.id;
        const status = session.state?.standing_session?.status as StandingSessionStatus | undefined;
        const dotColor = status ? statusDotColors[status] : statusDotColors.idle;

        const rowStyles = css`
          display: flex;
          align-items: center;
          gap: ${euiTheme.size.xs};
        `;

        const dotStyles = css`
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: ${dotColor};
          flex-shrink: 0;
        `;

        const linkStyle = css([
          isActive ? activeLinkStyles : linkStyles,
          css`
            flex: 1 1 0;
            min-width: 0;
          `,
        ]);

        return (
          <EuiFlexItem grow={false} key={session.id}>
            <div css={rowStyles}>
              <Link
                to={appPaths.agent.sessions.byId({ agentId, sessionId: session.id })}
                css={linkStyle}
                data-test-subj={`agentBuilderSidebarSession-${session.id}`}
              >
                {session.title || session.id}
              </Link>
              <div css={dotStyles} />
            </div>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { UserMessageEvent } from '@kbn/agent-builder-common';
import { useAgentBuilderAgentById } from '../../../../hooks/agents/use_agent_by_id';
import { AgentAvatar } from '../../../common/agent_avatar';
import { AuthorHeader } from '../author_header';
import { UserMessageText } from '../user_message/user_message_text';

const labels = {
  report: i18n.translate('xpack.agentBuilder.timeline.subagentReport.label', {
    defaultMessage: 'Sub-agent report',
  }),
  icon: i18n.translate('xpack.agentBuilder.timeline.subagentReport.iconTitle', {
    defaultMessage: 'Sub-agent',
  }),
};

interface SubagentReportEventProps {
  event: UserMessageEvent;
}

export const SubagentReportEvent: React.FC<SubagentReportEventProps> = ({ event }) => {
  const { euiTheme } = useEuiTheme();
  const { agent } = useAgentBuilderAgentById(event.actor.id);

  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="flexStart"
      responsive={false}
      data-test-subj="agentBuilderTimelineSubagentReport"
    >
      <EuiFlexItem
        grow={false}
        css={css`
          min-inline-size: ${euiTheme.size.l};
        `}
      >
        {agent ? (
          <AgentAvatar agent={agent} size="s" iconSize="l" />
        ) : (
          <EuiIcon type="processor" size="l" aria-label={labels.icon} />
        )}
      </EuiFlexItem>
      <EuiFlexItem
        grow={true}
        css={css`
          min-inline-size: 0;
        `}
      >
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem grow={false}>
            <AuthorHeader
              name={agent?.name ?? event.actor.id}
              showAgentBadge={true}
              label={labels.report}
              startedAt={event.created_at}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiPanel hasShadow={false} hasBorder={true} color="subdued" paddingSize="m">
              <EuiText size="s">
                <UserMessageText text={event.data.message} />
              </EuiText>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

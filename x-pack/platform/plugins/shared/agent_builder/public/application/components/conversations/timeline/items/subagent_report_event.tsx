/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { AgentMessageEvent } from '@kbn/agent-builder-common';
import { useAgentBuilderAgentById } from '../../../../hooks/agents/use_agent_by_id';
import { AgentAvatar } from '../../../common/agent_avatar';
import { StepLayout } from '../event_steps/step_layout';
import { UserMessageText } from '../user_message/user_message_text';

interface SubagentReportEventProps {
  event: AgentMessageEvent;
}

/** A background sub-agent's report, drawn like a step: one line, the text behind a click. */
export const SubagentReportEvent: React.FC<SubagentReportEventProps> = ({ event }) => {
  const { euiTheme } = useEuiTheme();
  const { agent } = useAgentBuilderAgentById(event.actor.id);
  const [isExpanded, setIsExpanded] = useState(false);

  const label = (
    <EuiText size="s">
      <p role="status">
        {agent ? (
          <FormattedMessage
            id="xpack.agentBuilder.timeline.subagentReport.finishedNamed"
            defaultMessage="Background agent finished · {name}"
            values={{ name: agent.name }}
          />
        ) : (
          <FormattedMessage
            id="xpack.agentBuilder.timeline.subagentReport.finished"
            defaultMessage="Background agent finished"
          />
        )}
      </p>
    </EuiText>
  );

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
        {agent && <AgentAvatar agent={agent} size="s" iconSize="l" />}
      </EuiFlexItem>
      <EuiFlexItem
        grow={true}
        css={css`
          min-inline-size: 0;
        `}
      >
        <StepLayout
          label={label}
          onClick={() => setIsExpanded((value) => !value)}
          isExpanded={isExpanded}
          expansion={
            <EuiPanel hasShadow={false} hasBorder={true} color="subdued" paddingSize="m">
              <EuiText size="s">
                <UserMessageText text={event.data.message} />
              </EuiText>
            </EuiPanel>
          }
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

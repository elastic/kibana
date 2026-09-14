/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingElastic, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { AgentDefinition, ConversationRound } from '@kbn/agent-builder-common';
import { ConversationRoundStatus } from '@kbn/agent-builder-common';
import { AgentAvatar } from '../../common/agent_avatar';
import { RoundAuthorHeader } from '../conversation_rounds/round_author_header';
import { AgentResponse } from './agent_response';
import { ExecutionTerminated } from './items/execution_terminated';
import { ExecutionFailed } from './items/execution_failed';
import { ExecutionAborted } from './items/execution_aborted';
import type { AgentTurnItem } from './to_thread_items';
import { isCompletedTurn, isFailedTurn, isAbortedTurn } from './to_thread_items';

const loadingLabel = i18n.translate('xpack.agentBuilder.thread.agentLoading', {
  defaultMessage: 'Agent is generating a response',
});

interface AgentTurnProps {
  item: AgentTurnItem;
  agent?: AgentDefinition | null;
}

const toSyntheticRound = (item: AgentTurnItem): ConversationRound => ({
  id: 'active',
  status: ConversationRoundStatus.inProgress,
  input: { message: '' },
  steps: item.steps,
  response: { message: item.response?.message ?? '' },
  started_at: new Date().toISOString(),
  time_to_first_token: item.timeToFirstToken ?? 0,
  time_to_last_token: 0,
  model_usage: {
    connector_id: '',
    llm_calls: 0,
    input_tokens: 0,
    output_tokens: 0,
    model: '',
  },
});

const renderContent = (item: AgentTurnItem): React.ReactNode => {
  if (isCompletedTurn(item)) {
    return <ExecutionTerminated event={item.terminal} steps={item.steps} />;
  }
  if (isFailedTurn(item)) {
    return <ExecutionFailed event={item.terminal} />;
  }
  if (isAbortedTurn(item)) {
    return <ExecutionAborted event={item.terminal} />;
  }
  if (item.steps.length === 0 && !item.response && !item.transientReasoning) {
    return null;
  }
  return (
    <AgentResponse
      steps={item.steps}
      response={{ message: item.response?.message ?? '' }}
      isLoading
      rawRound={toSyntheticRound(item)}
      transientReasoning={item.transientReasoning}
    />
  );
};

export const AgentTurn: React.FC<AgentTurnProps> = ({ item, agent }) => {
  const { euiTheme } = useEuiTheme();
  const { status, startedAt, origin } = item;
  const isLoading = status === 'running' || status === 'awaiting_prompt';

  const avatarColumnStyles = css`
    min-inline-size: ${euiTheme.size.l};
  `;

  const content = renderContent(item);

  return (
    <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
      <EuiFlexItem grow={false} css={avatarColumnStyles} data-test-subj="agentBuilderThreadAvatar">
        {isLoading ? (
          <EuiLoadingElastic size="l" aria-label={loadingLabel} />
        ) : (
          agent && <AgentAvatar agent={agent} size="s" iconSize="l" />
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={true}>
        <EuiFlexGroup direction="column" gutterSize="s">
          {agent && (
            <EuiFlexItem grow={false}>
              <RoundAuthorHeader
                name={agent.name}
                showAgentBadge
                origin={origin}
                startedAt={startedAt ?? new Date().toISOString()}
              />
            </EuiFlexItem>
          )}
          {content && <EuiFlexItem grow={false}>{content}</EuiFlexItem>}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

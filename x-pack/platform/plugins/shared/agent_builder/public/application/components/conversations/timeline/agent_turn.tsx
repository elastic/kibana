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
import type { AgentDefinition } from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { AgentAvatar } from '../../common/agent_avatar';
import { RoundAuthorHeader } from '../conversation_rounds/round_author_header';
import { AgentResponse } from './agent_response';
import { executionTerminatedToResponse } from './items/execution_terminated_event';
import { ExecutionFailedEvent } from './items/execution_failed_event';
import { ExecutionAbortedEvent } from './items/execution_aborted_event';
import type { AgentTurnItem } from './types';
import { isCompletedTurn, isFailedTurn, isAbortedTurn } from './timeline_item_utils';

const loadingLabel = i18n.translate('xpack.agentBuilder.timeline.agentLoading', {
  defaultMessage: 'Agent is generating a response',
});

interface AgentTurnProps {
  item: AgentTurnItem;
  agent?: AgentDefinition | null;
  conversationAttachments?: VersionedAttachment[];
}

// `AgentResponse` stays at the same position for running and completed turns so its subtree
// (expanded steps, streamed text) survives completion and the later swap to the saved item.
const renderContent = (
  item: AgentTurnItem,
  conversationAttachments?: VersionedAttachment[]
): React.ReactNode => {
  if (isCompletedTurn(item)) {
    const completed = executionTerminatedToResponse(item.terminal, item.steps);
    if (!completed) {
      return null;
    }
    return (
      <AgentResponse
        steps={completed.steps}
        response={completed.response}
        isLoading={false}
        executionTerminatedEvent={item.terminal}
        conversationAttachments={conversationAttachments}
        attachmentRefs={item.attachmentRefs}
        triggerAttachmentRefs={item.triggerAttachmentRefs}
      />
    );
  }
  if (isFailedTurn(item)) {
    return <ExecutionFailedEvent event={item.terminal} />;
  }
  if (isAbortedTurn(item)) {
    return <ExecutionAbortedEvent event={item.terminal} />;
  }
  if (item.steps.length === 0 && !item.response) {
    return null;
  }
  return (
    <AgentResponse
      steps={item.steps}
      response={{ message: item.response?.message ?? '' }}
      isLoading
      conversationAttachments={conversationAttachments}
      attachmentRefs={item.attachmentRefs}
    />
  );
};

export const AgentTurn: React.FC<AgentTurnProps> = ({ item, agent, conversationAttachments }) => {
  const { euiTheme } = useEuiTheme();
  const { status, startedAt, origin } = item;
  const isLoading = status === 'running' || status === 'awaiting_prompt';

  const avatarColumnStyles = css`
    min-inline-size: ${euiTheme.size.l};
  `;

  const content = renderContent(item, conversationAttachments);

  return (
    <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
      <EuiFlexItem
        grow={false}
        css={avatarColumnStyles}
        data-test-subj="agentBuilderTimelineAvatar"
      >
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

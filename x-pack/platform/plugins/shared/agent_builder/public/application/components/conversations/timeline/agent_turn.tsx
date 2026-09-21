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
import { parseExecutionId } from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { AgentAvatar } from '../../common/agent_avatar';
import { RoundAuthorHeader } from '../conversation_rounds/round_author_header';
import { AgentResponse } from './agent_response';
import { executionTerminatedToResponse } from './items/execution_terminated_event';
import { ExecutionFailedEvent } from './items/execution_failed_event';
import { ExecutionAbortedEvent } from './items/execution_aborted_event';
import { PendingPrompts } from './items/pending_prompts';
import type { AgentTurnItem } from './types';
import {
  isCompletedTurn,
  isFailedTurn,
  isAbortedTurn,
  isAwaitingPromptTurn,
} from './timeline_item_utils';

const loadingLabel = i18n.translate('xpack.agentBuilder.timeline.agentLoading', {
  defaultMessage: 'Agent is generating a response',
});

interface AgentTurnProps {
  item: AgentTurnItem;
  agent?: AgentDefinition | null;
  conversationAttachments?: VersionedAttachment[];
  showHeader?: boolean;
}

// One `AgentResponse` at the same position for running, awaiting-prompt and completed turns, so
// its subtree (expanded steps, streamed text) survives every state change and the swap to the
// saved item. An answered pause has no response of its own; its steps carry the question and
// answers.
const renderContent = (
  item: AgentTurnItem,
  conversationAttachments?: VersionedAttachment[]
): React.ReactNode => {
  if (isFailedTurn(item)) {
    return <ExecutionFailedEvent event={item.terminal} />;
  }
  if (isAbortedTurn(item)) {
    return <ExecutionAbortedEvent event={item.terminal} />;
  }

  const completedTerminal = isCompletedTurn(item) ? item.terminal : undefined;
  const completed = completedTerminal
    ? executionTerminatedToResponse(completedTerminal, item.steps)
    : undefined;
  const steps = completed?.steps ?? item.steps;
  const response = completed?.response ?? { message: item.response?.message ?? '' };
  const isAwaiting = isAwaitingPromptTurn(item);
  const hasContent = steps.length > 0 || response.message !== '';

  if (!isAwaiting && !hasContent) {
    return null;
  }

  const roundId = item.executionId ? parseExecutionId(item.executionId)?.roundId : undefined;
  const promptRequestedEventId = item.terminal?.id;

  return (
    <>
      {hasContent && (
        <AgentResponse
          steps={steps}
          response={response}
          isLoading={item.status === 'running'}
          executionTerminatedEvent={completed ? completedTerminal : undefined}
          conversationAttachments={conversationAttachments}
          attachmentRefs={item.attachmentRefs}
          triggerAttachmentRefs={completed ? item.triggerAttachmentRefs : undefined}
        />
      )}
      {isAwaiting && roundId && promptRequestedEventId && (
        <PendingPrompts
          prompts={item.pendingPrompts}
          promptRequestedEventId={promptRequestedEventId}
          roundId={roundId}
        />
      )}
    </>
  );
};

export const AgentTurn: React.FC<AgentTurnProps> = ({
  item,
  agent,
  conversationAttachments,
  showHeader = true,
}) => {
  const { euiTheme } = useEuiTheme();
  const { status, startedAt, origin } = item;
  const isLoading = status === 'running';

  const avatarColumnStyles = css`
    min-inline-size: ${euiTheme.size.l};
  `;

  const content = renderContent(item, conversationAttachments);

  return (
    <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
      {/* The column always renders so grouped turns stay aligned with the one above. */}
      <EuiFlexItem
        grow={false}
        css={avatarColumnStyles}
        data-test-subj="agentBuilderTimelineAvatar"
      >
        {isLoading ? (
          <EuiLoadingElastic size="l" aria-label={loadingLabel} />
        ) : (
          showHeader && agent && <AgentAvatar agent={agent} size="s" iconSize="l" />
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={true}>
        <EuiFlexGroup direction="column" gutterSize="s">
          {showHeader && agent && (
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

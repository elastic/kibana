/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAgentLoader,
  EuiFlexGroup,
  EuiFlexItem,
  EuiShimmeringText,
  useEuiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { AgentDefinition } from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { AgentAvatar } from '../../common/agent_avatar';
import { AuthorHeader } from './author_header';
import { useConversationId } from '../../../context/conversation/use_conversation_id';
import { EventSteps } from './event_steps/event_steps';
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

const thinkingFallback = i18n.translate('xpack.agentBuilder.timeline.agentThinkingLabel', {
  defaultMessage: 'Thinking...',
});

interface AgentTurnProps {
  item: AgentTurnItem;
  agent?: AgentDefinition | null;
  conversationAttachments?: VersionedAttachment[];
  /** True while an answered prompt's resume is in flight but its first event has not arrived yet. */
  isResuming?: boolean;
}

// One `AgentResponse` at the same position for running, awaiting-prompt and completed turns, so
// its subtree (expanded steps, streamed text) survives every state change and the swap to the
// saved item. An answered pause has no response of its own; its steps carry the question and
// answers.
const renderContent = (
  item: AgentTurnItem,
  conversationId: string | undefined,
  conversationAttachments?: VersionedAttachment[]
): React.ReactNode => {
  const { executionId } = item;
  if (isFailedTurn(item) || isAbortedTurn(item)) {
    return (
      <EuiFlexGroup direction="column" gutterSize="s">
        {item.steps.length > 0 && (
          <EuiFlexItem grow={false}>
            <EventSteps
              steps={item.steps}
              conversationAttachments={conversationAttachments}
              attachmentRefs={item.attachmentRefs}
              conversationId={conversationId}
              isAborted
            />
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          {isFailedTurn(item) ? (
            <ExecutionFailedEvent event={item.terminal} />
          ) : (
            <ExecutionAbortedEvent event={item.terminal} />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  const completedTerminal = isCompletedTurn(item) ? item.terminal : undefined;
  const completed = completedTerminal
    ? executionTerminatedToResponse(completedTerminal, item.steps)
    : undefined;
  const steps = completed?.steps ?? item.steps;
  const response = completed?.response ?? { message: item.response?.message ?? '' };
  const isAwaiting = isAwaitingPromptTurn(item);
  const hasContent =
    steps.length > 0 || response.message !== '' || Boolean(completed?.response?.structured_output);

  if (!isAwaiting && !hasContent) {
    return null;
  }

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
          executionId={executionId}
        />
      )}
      {isAwaiting && promptRequestedEventId && (
        <PendingPrompts
          prompts={item.pendingPrompts}
          promptRequestedEventId={promptRequestedEventId}
        />
      )}
    </>
  );
};

const AgentTurnComponent: React.FC<AgentTurnProps> = ({
  item,
  agent,
  conversationAttachments,
  isResuming = false,
}) => {
  const { euiTheme } = useEuiTheme();
  // EuiShimmeringText sets the `m` size inline. EuiText `s` is `m` scaled by `s`.
  const thinkingFont = useEuiFontSize('m', { customScale: 's' });
  const conversationId = useConversationId();
  const { status, startedAt, origin } = item;
  const isLoading = status === 'running' || isResuming;

  const avatarColumnStyles = css`
    /* Same box as AgentAvatar size "s", so the smaller loader shares its centre. */
    inline-size: ${euiTheme.size.l};
    block-size: ${euiTheme.size.l};
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  `;

  const contentColumnStyles = css`
    min-inline-size: 0;
  `;

  const content = renderContent(item, conversationId, conversationAttachments);

  return (
    <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
      {/* The column keeps its width while the agent definition is still loading. */}
      <EuiFlexItem
        grow={false}
        css={avatarColumnStyles}
        data-test-subj="agentBuilderTimelineAvatar"
      >
        {isLoading ? (
          // POC: EuiAgentLoader stands in for the avatar while the turn is generating or resuming.
          <EuiAgentLoader size="m" aria-label={loadingLabel} />
        ) : (
          agent && <AgentAvatar agent={agent} size="s" iconSize="l" />
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={true} css={contentColumnStyles}>
        <EuiFlexGroup direction="column" gutterSize="s">
          {agent && (
            <EuiFlexItem grow={false}>
              <AuthorHeader
                name={agent.name}
                showAgentBadge
                origin={origin}
                startedAt={startedAt ?? new Date().toISOString()}
              />
            </EuiFlexItem>
          )}
          {isLoading && !item.response?.message && (
            <EuiFlexItem grow={false}>
              {/* POC: shimmer the thinking line until the answer text starts. */}
              <EuiShimmeringText data-test-subj="agentBuilderThinkingText" style={thinkingFont}>
                {item.thinking || thinkingFallback}
              </EuiShimmeringText>
            </EuiFlexItem>
          )}
          {content && <EuiFlexItem grow={false}>{content}</EuiFlexItem>}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const AgentTurn = React.memo(AgentTurnComponent);
AgentTurn.displayName = 'AgentTurn';

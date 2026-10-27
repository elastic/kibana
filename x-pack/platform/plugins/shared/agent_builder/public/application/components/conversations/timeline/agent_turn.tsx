/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAvatar,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingElastic,
  EuiText,
  euiCanAnimate,
  useEuiTheme,
} from '@elastic/eui';
import { css, keyframes } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useMotionRefreshSettings } from '@kbn/react-kibana-context-root';
import type { AgentDefinition } from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { AuthorHeader } from './author_header';
import { useConversationId } from '../../../context/conversation/use_conversation_id';
import { EventSteps } from './event_steps/event_steps';
import { AgentResponse } from './agent_response';
import { executionTerminatedToResponse } from './items/execution_terminated_event';
import { ExecutionFailedEvent } from './items/execution_failed_event';
import { ExecutionAbortedEvent } from './items/execution_aborted_event';
import { PendingPrompts } from './items/pending_prompts';
import type { AgentTurnItem } from './types';
import { OrbitAvatarIcon } from './orbit_dots_loader';
import { ShimmeringText } from './shimmering_text';
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

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

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

export const AgentTurn: React.FC<AgentTurnProps> = ({
  item,
  agent,
  conversationAttachments,
  isResuming = false,
}) => {
  const { euiTheme } = useEuiTheme();
  const { dots, shimmer } = useMotionRefreshSettings();
  const conversationId = useConversationId();
  const { status, startedAt, origin } = item;
  const isLoading = status === 'running' || isResuming;

  const avatarColumnStyles = css`
    min-inline-size: ${euiTheme.size.l};
  `;

  const avatarSettleStyles = css`
    display: flex;
    ${euiCanAnimate} {
      animation: ${fadeIn} ${euiTheme.animation.slow} ease-out;
    }
  `;

  const showOrbit = isLoading && dots;

  const content = renderContent(item, conversationId, conversationAttachments);

  return (
    <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
      {/* The column keeps its width while the agent definition is still loading. */}
      <EuiFlexItem
        grow={false}
        css={avatarColumnStyles}
        data-test-subj="agentBuilderTimelineAvatar"
      >
        {showOrbit || (!isLoading && agent) ? (
          <span key={showOrbit ? 'orbit' : 'logo'} css={avatarSettleStyles}>
            <EuiAvatar
              size="s"
              type="user"
              color="subdued"
              name={showOrbit ? loadingLabel : agent?.name ?? loadingLabel}
              iconType={showOrbit ? OrbitAvatarIcon : 'logoElastic'}
              iconSize={showOrbit ? 'm' : 'l'}
              iconColor={null}
              data-test-subj="agentBuilderTurnAvatar"
            />
          </span>
        ) : isLoading ? (
          <EuiLoadingElastic size="l" aria-label={loadingLabel} />
        ) : null}
      </EuiFlexItem>
      <EuiFlexItem grow={true}>
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
              <EuiText size="s" data-test-subj="agentBuilderThinkingText">
                <p>
                  {shimmer ? (
                    <ShimmeringText text={item.thinking || thinkingFallback} />
                  ) : (
                    item.thinking || thinkingFallback
                  )}
                </p>
              </EuiText>
            </EuiFlexItem>
          )}
          {content && <EuiFlexItem grow={false}>{content}</EuiFlexItem>}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

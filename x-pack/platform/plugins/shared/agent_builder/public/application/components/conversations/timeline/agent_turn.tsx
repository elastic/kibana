/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingElastic, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { AgentDefinition, ConversationRoundStep } from '@kbn/agent-builder-common';
import { isAskUserQuestionStep } from '@kbn/agent-builder-common';
import type { PromptRequest, PromptResponse } from '@kbn/agent-builder-common/agents';
import { isAskUserQuestionPrompt } from '@kbn/agent-builder-common/agents';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { AgentAvatar } from '../../common/agent_avatar';
import { RoundAuthorHeader } from '../conversation_rounds/round_author_header';
import { RoundEvents } from '../conversation_rounds/round_events/round_events';
import { AgentResponse } from './agent_response';
import { useConversationId } from '../../../context/conversation/use_conversation_id';
import { executionTerminatedToResponse } from './items/execution_terminated_event';
import { ExecutionFailedEvent } from './items/execution_failed_event';
import { ExecutionAbortedEvent } from './items/execution_aborted_event';
import type { PromptRequestEventProps } from './items/prompt_request_event';
import { PromptRequestEvent } from './items/prompt_request_event';
import type { AgentTurnItem } from './to_timeline_items';
import {
  isCompletedTurn,
  isFailedTurn,
  isAbortedTurn,
  isAwaitingPromptTurn,
} from './to_timeline_items';

const loadingLabel = i18n.translate('xpack.agentBuilder.timeline.agentLoading', {
  defaultMessage: 'Agent is generating a response',
});

export interface PromptResumeProps {
  onResumePrompt?: (params: {
    prompts: Record<string, PromptResponse>;
    promptRequestedEventId: string;
  }) => void;
  isResuming?: boolean;
  isPromptDisabled?: boolean;
}

interface AgentTurnProps extends PromptResumeProps {
  item: AgentTurnItem;
  agent?: AgentDefinition | null;
  conversationAttachments?: VersionedAttachment[];
}

interface PromptRendering {
  onResume: PromptRequestEventProps['onResume'];
  isResuming?: boolean;
  isPromptDisabled?: boolean;
}

const hidePreviewedQuestionSteps = (
  steps: ConversationRoundStep[],
  pendingPrompts: PromptRequest[]
): ConversationRoundStep[] => {
  const previewedIds = new Set(
    pendingPrompts.filter(isAskUserQuestionPrompt).map((prompt) => prompt.id)
  );
  if (previewedIds.size === 0) return steps;
  return steps.filter(
    (step) => !(isAskUserQuestionStep(step) && !step.answers && previewedIds.has(step.prompt_id))
  );
};

// `AgentResponse` stays at the same position for running and completed turns so its subtree
// (expanded steps, streamed text) survives completion and the later swap to the saved item.
const renderContent = (
  item: AgentTurnItem,
  resume: PromptRendering,
  conversationId: string | undefined,
  conversationAttachments?: VersionedAttachment[]
): React.ReactNode => {
  if (isFailedTurn(item)) {
    return <ExecutionFailedEvent event={item.terminal} />;
  }
  if (isAbortedTurn(item)) {
    return <ExecutionAbortedEvent event={item.terminal} />;
  }

  if (isCompletedTurn(item)) {
    const completed = executionTerminatedToResponse(item.terminal, item.steps);
    if (completed) {
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
    // A pause resolved by an answer has no response of its own — just the steps it left behind.
    if (item.steps.length === 0) {
      return null;
    }
    return (
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem grow={false}>
          <RoundEvents
            steps={item.steps}
            conversationAttachments={conversationAttachments}
            attachmentRefs={item.attachmentRefs}
            conversationId={conversationId}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (isAwaitingPromptTurn(item)) {
    const steps = hidePreviewedQuestionSteps(item.steps, item.pendingPrompts);
    return (
      <EuiFlexGroup direction="column" gutterSize="s">
        {steps.length > 0 && (
          <EuiFlexItem grow={false}>
            <RoundEvents
              steps={steps}
              conversationAttachments={conversationAttachments}
              attachmentRefs={item.attachmentRefs}
              conversationId={conversationId}
            />
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <PromptRequestEvent
            prompts={item.pendingPrompts}
            onResume={resume.onResume}
            isResuming={resume.isResuming}
            isDisabled={resume.isPromptDisabled || !item.terminal?.id}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
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

export const AgentTurn: React.FC<AgentTurnProps> = ({
  item,
  agent,
  conversationAttachments,
  onResumePrompt,
  isResuming,
  isPromptDisabled,
}) => {
  const { euiTheme } = useEuiTheme();
  const conversationId = useConversationId();
  const { status, startedAt, origin, terminal } = item;
  const isLoading = status === 'running' || status === 'awaiting_prompt';

  const avatarColumnStyles = css`
    min-inline-size: ${euiTheme.size.l};
  `;

  const onResume = useCallback<PromptRequestEventProps['onResume']>(
    ({ prompts }) => {
      if (!terminal?.id) return;
      onResumePrompt?.({ prompts, promptRequestedEventId: terminal.id });
    },
    [onResumePrompt, terminal?.id]
  );

  const content = renderContent(
    item,
    { onResume, isResuming, isPromptDisabled },
    conversationId,
    conversationAttachments
  );

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

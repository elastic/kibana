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
import { AgentAvatar } from '../../common/agent_avatar';
import { RoundAuthorHeader } from '../conversation_rounds/round_author_header';
import { RoundEvents } from '../conversation_rounds/round_events/round_events';
import { ResponseMessage } from '../conversation_rounds/round_response/response_message';
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

const renderContent = (item: AgentTurnItem, resume: PromptRendering): React.ReactNode => {
  if (isFailedTurn(item)) {
    return <ExecutionFailedEvent event={item.terminal} />;
  }
  if (isAbortedTurn(item)) {
    return <ExecutionAbortedEvent event={item.terminal} />;
  }

  const awaiting = isAwaitingPromptTurn(item);
  const completedTerminal = isCompletedTurn(item) ? item.terminal : undefined;
  const completed = completedTerminal
    ? executionTerminatedToResponse(completedTerminal, item.steps)
    : undefined;

  const steps = awaiting
    ? hidePreviewedQuestionSteps(item.steps, item.pendingPrompts)
    : completed?.steps ?? item.steps;

  let trailing: React.ReactNode = null;
  if (awaiting) {
    trailing = (
      <PromptRequestEvent
        prompts={item.pendingPrompts}
        onResume={resume.onResume}
        isResuming={resume.isResuming}
        isDisabled={resume.isPromptDisabled || !item.terminal?.id}
      />
    );
  } else if (completed) {
    trailing = (
      <ResponseMessage
        response={completed.response}
        steps={completed.steps}
        isLoading={false}
        hasError={false}
        executionTerminatedEvent={completedTerminal}
      />
    );
  } else if (!isCompletedTurn(item) && (steps.length > 0 || item.response)) {
    trailing = (
      <ResponseMessage
        response={{ message: item.response?.message ?? '' }}
        steps={steps}
        isLoading
        hasError={false}
      />
    );
  }

  if (steps.length === 0 && !trailing) {
    return null;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {steps.length > 0 && (
        <EuiFlexItem grow={false}>
          <RoundEvents steps={steps} />
        </EuiFlexItem>
      )}
      {trailing && <EuiFlexItem grow={false}>{trailing}</EuiFlexItem>}
    </EuiFlexGroup>
  );
};

export const AgentTurn: React.FC<AgentTurnProps> = ({
  item,
  agent,
  onResumePrompt,
  isResuming,
  isPromptDisabled,
}) => {
  const { euiTheme } = useEuiTheme();
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

  const content = renderContent(item, { onResume, isResuming, isPromptDisabled });

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

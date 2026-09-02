/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingElastic, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useState, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { ConversationRound } from '@kbn/agent-builder-common';
import type {
  VersionedAttachment,
  AttachmentVersionRef,
} from '@kbn/agent-builder-common/attachments';
import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import { ConversationRoundStatus } from '@kbn/agent-builder-common';
import { findTodosStep } from '@kbn/agent-builder-common/chat/conversation';
import { AgentPromptType, type PromptResponse } from '@kbn/agent-builder-common/agents';
import { RoundInput } from './round_input';
import { RoundEvents } from './round_events/round_events';
import { RoundResponse } from './round_response/round_response';
import { AgentAvatar } from '../../common/agent_avatar';
import { RoundAuthorHeader } from './round_author_header';
import { useConversationStream } from '../../../hooks/use_conversation_stream';
import { RoundError } from './round_error/round_error';
import { AuthorizationPrompt, ConfirmationPrompt, AskUserQuestionPrompt } from './round_prompt';
import { RoundAttachmentReferences } from './round_attachment_references';
import { TodosStepDisplay } from './todos_step_display';
import { isPendingCurrentRound } from '../../../utils/new_conversation';
import { useAgentBuilderAgentById } from '../../../hooks/agents/use_agent_by_id';
import { useAgentId, useConversationReadOnly } from '../../../hooks/use_conversation';

interface RoundLayoutProps {
  isCurrentRound: boolean;
  rawRound: ConversationRound;
  conversationAttachments?: VersionedAttachment[];
  conversationId?: string;
  allRounds: ConversationRound[];
  roundIndex: number;
}

const labels = {
  container: i18n.translate('xpack.agentBuilder.round.container', {
    defaultMessage: 'Conversation round',
  }),
  streamingResponse: i18n.translate('xpack.agentBuilder.round.streamingResponse', {
    defaultMessage: 'Streaming response',
  }),
};

/**
 * Computes cumulative attachment refs from all rounds up to and including the given index.
 * Returns the highest version seen for each attachment.
 */
const computeCumulativeRefs = (
  rounds: ConversationRound[],
  upToIndex: number
): AttachmentVersionRef[] | undefined => {
  const highestVersionByAttachment = new Map<string, AttachmentVersionRef>();

  for (let i = 0; i <= upToIndex; i++) {
    const roundRefs = rounds[i]?.input.attachment_refs;
    if (roundRefs) {
      for (const ref of roundRefs) {
        const existing = highestVersionByAttachment.get(ref.attachment_id);
        if (!existing || ref.version > existing.version) {
          highestVersionByAttachment.set(ref.attachment_id, ref);
        }
      }
    }
  }

  const values = Array.from(highestVersionByAttachment.values());
  return values.length > 0 ? values : undefined;
};

const getAttachmentRefsKey = (attachmentRefs: AttachmentVersionRef[] | undefined): string =>
  attachmentRefs
    ?.map(
      ({ attachment_id: attachmentId, version }) => `${encodeURIComponent(attachmentId)}:${version}`
    )
    .join('|') ?? '';

const parseAttachmentRefsKey = (attachmentRefsKey: string): AttachmentVersionRef[] | undefined => {
  if (!attachmentRefsKey) {
    return undefined;
  }

  return attachmentRefsKey.split('|').map((refKey) => {
    const [encodedAttachmentId, version] = refKey.split(':');
    return {
      attachment_id: decodeURIComponent(encodedAttachmentId),
      version: Number(version),
    };
  });
};

export const RoundLayout: React.FC<RoundLayoutProps> = ({
  isCurrentRound,
  rawRound,
  conversationAttachments,
  conversationId,
  allRounds,
  roundIndex,
}) => {
  const { euiTheme } = useEuiTheme();
  const [promptResponses, setPromptResponses] = useState<Record<string, PromptResponse>>({});
  const {
    steps,
    response,
    input,
    origin,
    author,
    started_at: startedAt,
    status,
    pending_prompts: pendingPrompts,
  } = rawRound;
  const agentId = useAgentId();
  const { isReadOnly, isLoading: isConversationReadOnlyLoading } = useConversationReadOnly();
  const { agent } = useAgentBuilderAgentById(agentId);
  const todosStep = useMemo(() => findTodosStep(steps), [steps]);

  const {
    isResponseLoading,
    isStreaming,
    error,
    retry: retrySendMessage,
    resumeRound,
    isResuming,
  } = useConversationStream();
  const isHitlDisabled =
    isReadOnly || isConversationReadOnlyLoading || (isStreaming && !isResuming);

  const isLoadingCurrentRound = isResponseLoading && isCurrentRound;
  const isErrorCurrentRound = Boolean(error) && isCurrentRound;
  // Don't show prompts if we're already resuming (user already clicked confirm/cancel)
  // This prevents prompts from reappearing when server data is refetched
  const isAwaitingPrompt =
    isCurrentRound &&
    status === ConversationRoundStatus.awaitingPrompt &&
    pendingPrompts &&
    pendingPrompts.length > 0 &&
    !isResuming;

  const cumulativeAttachmentRefsKey = useMemo(() => {
    if (!response?.message) {
      return '';
    }
    return getAttachmentRefsKey(computeCumulativeRefs(allRounds, roundIndex));
  }, [allRounds, roundIndex, response?.message]);

  const attachmentRefs = useMemo(
    () => parseAttachmentRefsKey(cumulativeAttachmentRefsKey),
    [cumulativeAttachmentRefsKey]
  );

  const handlePromptResponse = useCallback(
    (promptId: string, promptResponse: PromptResponse) => {
      setPromptResponses((prev) => {
        const updated = { ...prev, [promptId]: promptResponse };
        const allAnswered = (pendingPrompts ?? []).every((p) => updated[p.id] !== undefined);
        if (allAnswered) {
          resumeRound({ prompts: updated });
        }
        return updated;
      });
    },
    [pendingPrompts, resumeRound]
  );

  const avatarColumnStyles = css`
    min-inline-size: ${euiTheme.size.l};
  `;

  const agentOutputContent = (
    <>
      {/* Steps container — always rendered above the error block so steps
          stay anchored where the user last saw them. */}
      {steps.length > 0 && (
        <EuiFlexItem grow={false}>
          <RoundEvents
            steps={steps}
            conversationAttachments={conversationAttachments}
            attachmentRefs={attachmentRefs}
            conversationId={conversationId}
          />
        </EuiFlexItem>
      )}

      {/* Error */}
      {isErrorCurrentRound && (
        <EuiFlexItem grow={false}>
          <RoundError error={error} onRetry={retrySendMessage} />
        </EuiFlexItem>
      )}

      {/* Todos */}
      {todosStep && (
        <EuiFlexItem grow={false}>
          <TodosStepDisplay step={todosStep} />
        </EuiFlexItem>
      )}

      {/* Pending Prompts */}
      {isAwaitingPrompt &&
        (pendingPrompts ?? []).map((prompt) => {
          switch (prompt.type) {
            case AgentPromptType.confirmation: {
              const stored = promptResponses[prompt.id];
              return (
                <EuiFlexItem grow={false} key={prompt.id}>
                  <ConfirmationPrompt
                    prompt={prompt}
                    onConfirm={() => handlePromptResponse(prompt.id, { allow: true })}
                    onCancel={() => handlePromptResponse(prompt.id, { allow: false })}
                    isLoading={isResuming}
                    isDisabled={isHitlDisabled}
                    isAnswered={stored !== undefined}
                    answeredValue={stored && 'allow' in stored ? stored.allow : undefined}
                  />
                </EuiFlexItem>
              );
            }
            case AgentPromptType.authorization: {
              const stored = promptResponses[prompt.id];
              return (
                <EuiFlexItem grow={false} key={prompt.id}>
                  <AuthorizationPrompt
                    prompt={prompt}
                    onAuthorize={() => handlePromptResponse(prompt.id, { authorized: true })}
                    onCancel={() => handlePromptResponse(prompt.id, { authorized: false })}
                    isLoading={isResuming}
                    isDisabled={isHitlDisabled}
                    isAnswered={stored !== undefined}
                    answeredValue={stored && 'authorized' in stored ? stored.authorized : undefined}
                  />
                </EuiFlexItem>
              );
            }
            case AgentPromptType.ask_user_question:
              return (
                <React.Fragment key={prompt.id}>
                  <EuiFlexItem grow={false}>
                    <AskUserQuestionPrompt
                      promptId={prompt.id}
                      questions={prompt.questions}
                      onSubmit={(r) => handlePromptResponse(prompt.id, r)}
                      isLoading={isResuming}
                      isDisabled={isHitlDisabled}
                    />
                  </EuiFlexItem>
                </React.Fragment>
              );
          }
        })}

      {/* Response */}
      {!isAwaitingPrompt && (
        <EuiFlexItem grow={false}>
          <RoundResponse
            hasError={isErrorCurrentRound}
            response={response}
            steps={steps}
            isLoading={isLoadingCurrentRound}
            isLastRound={isCurrentRound}
            conversationAttachments={conversationAttachments}
            attachmentRefs={attachmentRefs}
            conversationId={conversationId}
            rawRound={rawRound}
          />
          <RoundAttachmentReferences
            attachmentRefs={input.attachment_refs}
            conversationAttachments={conversationAttachments}
            actorFilter={[ATTACHMENT_REF_ACTOR.agent, ATTACHMENT_REF_ACTOR.system]}
          />
        </EuiFlexItem>
      )}
    </>
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="s" aria-label={labels.container}>
      {/* Input Message */}
      <EuiFlexItem grow={false}>
        <RoundInput
          input={input.message}
          author={author}
          isPendingCurrentRound={isPendingCurrentRound({ isCurrentRound, roundId: rawRound.id })}
          origin={origin}
          startedAt={startedAt}
          attachmentRefs={input.attachment_refs}
          conversationAttachments={conversationAttachments}
          fallbackAttachments={input.attachments}
        />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFlexGroup
          gutterSize="s"
          alignItems="flexStart"
          responsive={false}
          data-test-subj="agentBuilderRoundAgentLayout"
        >
          <EuiFlexItem
            grow={false}
            css={avatarColumnStyles}
            data-test-subj="agentBuilderRoundAgentAvatar"
          >
            {isLoadingCurrentRound ? (
              <EuiLoadingElastic size="l" aria-label={labels.streamingResponse} />
            ) : (
              agent && <AgentAvatar agent={agent} size="s" iconSize="l" />
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={true} data-test-subj="agentBuilderRoundAgentContent">
            <EuiFlexGroup direction="column" gutterSize="s">
              {agent && (
                <EuiFlexItem grow={false}>
                  <RoundAuthorHeader
                    name={agent.name}
                    showAgentBadge
                    origin={origin}
                    startedAt={startedAt}
                  />
                </EuiFlexItem>
              )}
              {agentOutputContent}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      {/* Add spacing after the final round so that text is not cut off by the scroll mask */}
      {isCurrentRound && <EuiSpacer size="l" />}
    </EuiFlexGroup>
  );
};

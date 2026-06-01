/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { ConversationRound, OtherStep } from '@kbn/agent-builder-common';
import { ConversationRoundStatus, isOtherStep } from '@kbn/agent-builder-common';
import type {
  VersionedAttachment,
  AttachmentVersionRef,
} from '@kbn/agent-builder-common/attachments';
import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import { findTodosStep } from '@kbn/agent-builder-common/chat/conversation';
import {
  AgentPromptType,
  isConfirmationPrompt,
  isFormPrompt,
} from '@kbn/agent-builder-common/agents';
import type { FormPromptRequest, FormPromptResponse } from '@kbn/agent-builder-common/agents';
import { RoundInput } from './round_input';
import { RoundThinking } from './round_thinking/round_thinking';
import { RoundResponse } from './round_response/round_response';
import { useConversationStream } from '../../../hooks/use_conversation_stream';
import { RoundError } from './round_error/round_error';
import { ConfirmationPrompt, FormPrompt } from './round_prompt';
import { RoundAttachmentReferences } from './round_attachment_references';
import { TodosStepDisplay } from './todos_step_display';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';

interface RoundLayoutProps {
  isCurrentRound: boolean;
  scrollContainerHeight: number;
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
  formDataSubmitted: i18n.translate('xpack.agentBuilder.round.formDataSubmitted', {
    defaultMessage: '[Form data submitted]',
  }),
  notApplied: i18n.translate('xpack.agentBuilder.formPrompt.notApplied', {
    defaultMessage: 'Not applied',
  }),
};

const toHistoryFormPrompt = (step: OtherStep): FormPromptRequest => ({
  ...(step.agent_context !== undefined && { agent_context: step.agent_context }),
  execution_id: step.execution_id,
  id: step.step_execution_id,
  message: step.message ?? '',
  schema: step.schema ?? {},
  step_execution_id: step.step_execution_id,
  type: AgentPromptType.form,
});

const noop = () => {};

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

export const RoundLayout: React.FC<RoundLayoutProps> = ({
  isCurrentRound,
  scrollContainerHeight,
  rawRound,
  conversationAttachments,
  conversationId,
  allRounds,
  roundIndex,
}) => {
  const { inboxEnabled } = useAgentBuilderServices();
  const [roundContainerMinHeight, setRoundContainerMinHeight] = useState(0);
  const [hasBeenLoading, setHasBeenLoading] = useState(false);
  const [promptResponses, setPromptResponses] = useState<Record<string, { allow: boolean }>>({});
  const [optimisticForms, setOptimisticForms] = useState<
    Map<string, { prompt: FormPromptRequest; values: Record<string, unknown> }>
  >(new Map());
  const { steps, response, input, status, pending_prompts: pendingPrompts } = rawRound;
  const todosStep = useMemo(() => findTodosStep(steps), [steps]);

  const {
    isResponseLoading,
    isStreaming,
    error,
    retry: retrySendMessage,
    resumeRound,
    isResuming,
  } = useConversationStream();
  // HITL Approve / Cancel is per-conversation: streamActions are closure-bound to
  // vars.conversationId, so other in-flight conversations cannot corrupt this cache.
  // Use `isStreaming` (not `isResponseLoading`) so the buttons stay disabled during the
  // window where the send mutation has emitted `pending_prompt` (round is now
  // `awaitingPrompt`) but `mutationFn` hasn't reached its `finally` yet — clicking
  // Approve there would race the still-in-flight send mutation.
  const isHitlDisabled = isStreaming && !isResuming;

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

  const cumulativeAttachmentRefs = useMemo(() => {
    if (!response?.message) return undefined;
    return computeCumulativeRefs(allRounds, roundIndex);
  }, [allRounds, roundIndex, response?.message]);

  const confirmationPrompts = useMemo(
    () => (pendingPrompts ?? []).filter(isConfirmationPrompt),
    [pendingPrompts]
  );

  const formPrompts = useMemo(
    () => (inboxEnabled ? (pendingPrompts ?? []).filter(isFormPrompt) : []),
    [inboxEnabled, pendingPrompts]
  );

  const submittedFormHistory = useMemo(
    () =>
      inboxEnabled
        ? steps.filter(isOtherStep).sort((a, b) => a.submitted_at.localeCompare(b.submitted_at))
        : [],
    [inboxEnabled, steps]
  );

  // Stale forms (CAS-failed submissions) were appended before the LLM generated this
  // round's response — render them before the response so the narrative can reference them.
  // Fresh forms were submitted after the LLM response — render them after the response.
  const staleFormHistory = useMemo(
    () => submittedFormHistory.filter((s) => s.kind === 'hitl_form_response_stale'),
    [submittedFormHistory]
  );

  const freshFormHistory = useMemo(
    () => submittedFormHistory.filter((s) => s.kind === 'hitl_form_response'),
    [submittedFormHistory]
  );

  const pendingOptimisticForms = useMemo(() => {
    const confirmedIds = new Set(submittedFormHistory.map((s) => s.step_execution_id));
    return Array.from(optimisticForms.entries()).filter(([id]) => !confirmedIds.has(id));
  }, [optimisticForms, submittedFormHistory]);

  const handlePromptResponse = useCallback(
    (promptId: string, allow: boolean) => {
      setPromptResponses((prev) => {
        const updated = { ...prev, [promptId]: { allow } };
        const allAnswered = confirmationPrompts.every((p) => updated[p.id] !== undefined);
        if (allAnswered) {
          resumeRound({ prompts: updated });
        }
        return updated;
      });
    },
    [confirmationPrompts, resumeRound]
  );

  const handleFormSubmit = useCallback(
    (formResponse: FormPromptResponse) => {
      const matchedPrompt = formPrompts.find((p) => p.id === formResponse.id);
      if (matchedPrompt) {
        setOptimisticForms((prev) => {
          const next = new Map(prev);
          next.set(formResponse.id, { prompt: matchedPrompt, values: formResponse.values });
          return next;
        });
      }
      // Stamp expected_resume_seq so the server CAS rejects stale submissions
      // (e.g. a second tab racing) atomically rather than producing contradictory
      // ES state. Missing on legacy prompts; server falls back to unconditional
      // resume in that case.
      const responseWithSeq: FormPromptResponse =
        matchedPrompt && typeof matchedPrompt.resume_seq === 'number'
          ? { ...formResponse, expected_resume_seq: matchedPrompt.resume_seq + 1 }
          : formResponse;
      resumeRound({ form_prompts: [responseWithSeq] });
    },
    [formPrompts, resumeRound]
  );

  // Track if this round has ever been in a loading state during this session
  useEffect(() => {
    if (isCurrentRound && isResponseLoading) {
      setHasBeenLoading(true);
    }
  }, [isCurrentRound, isResponseLoading]);

  useEffect(() => {
    // Keep min-height while loading/thinking so the UI doesn't jump.
    // Remove it when prompts are visible (isAwaitingPrompt) — the content has stabilised
    // and keeping min-height would push the form above the viewport when the scroll
    // snaps to the bottom of the (otherwise empty) tall container.
    const shouldHaveMinHeight =
      isErrorCurrentRound ||
      (isCurrentRound &&
        (isResponseLoading || hasBeenLoading) &&
        (!inboxEnabled || !isAwaitingPrompt));

    setRoundContainerMinHeight(shouldHaveMinHeight ? scrollContainerHeight : 0);
  }, [
    isCurrentRound,
    isResponseLoading,
    hasBeenLoading,
    scrollContainerHeight,
    isErrorCurrentRound,
    isAwaitingPrompt,
    inboxEnabled,
  ]);

  const roundContainerStyles = css`
    ${roundContainerMinHeight > 0 ? `min-height: ${roundContainerMinHeight}px;` : 'flex-grow: 0;'};
  `;
  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      aria-label={labels.container}
      css={roundContainerStyles}
    >
      {/* Input Message — use a placeholder when the message is empty and
          the round was triggered by a HITL form submission (empty message
          is the server convention for form-only resume turns). */}
      <EuiFlexItem grow={false}>
        <RoundInput
          input={input.message || (submittedFormHistory.length > 0 ? labels.formDataSubmitted : '')}
          attachmentRefs={input.attachment_refs}
          conversationAttachments={conversationAttachments}
          fallbackAttachments={input.attachments}
        />
      </EuiFlexItem>

      {/* Thinking - treat awaiting prompt as loading to show last reasoning event */}
      <EuiFlexItem grow={false}>
        {isErrorCurrentRound ? (
          <RoundError error={error} onRetry={retrySendMessage} />
        ) : (
          <RoundThinking
            isAwaitingPrompt={Boolean(isAwaitingPrompt)}
            isLoading={isLoadingCurrentRound}
            rawRound={rawRound}
            steps={steps}
          />
        )}
      </EuiFlexItem>

      {/* Todos */}
      {todosStep && (
        <EuiFlexItem grow={false}>
          <TodosStepDisplay step={todosStep} />
        </EuiFlexItem>
      )}

      {/* Stale HITL form history (CAS-failed submissions, readonly, desaturated).
          Rendered BEFORE the response: the LLM generated this round's response
          after seeing the stale audit step, so the narrative naturally references it. */}
      {staleFormHistory.map((step) => (
        <EuiFlexItem grow={false} key={step.step_execution_id} style={{ filter: 'grayscale(1)' }}>
          <EuiBadge color="warning" data-test-subj={`hitl-stale-badge-${step.step_execution_id}`}>
            {labels.notApplied}
          </EuiBadge>
          <FormPrompt
            answeredValues={step.submitted_values}
            isAnswered
            isDisabled
            onSubmit={noop}
            prompt={toHistoryFormPrompt(step)}
          />
        </EuiFlexItem>
      ))}

      {/* Response Message */}
      <EuiFlexItem grow={false}>
        <EuiFlexItem>
          <RoundResponse
            hasError={isErrorCurrentRound}
            response={response}
            steps={steps}
            isLoading={isLoadingCurrentRound}
            isLastRound={isCurrentRound}
            conversationAttachments={conversationAttachments}
            attachmentRefs={cumulativeAttachmentRefs}
            conversationId={conversationId}
          />
        </EuiFlexItem>
        <EuiSpacer />
        <RoundAttachmentReferences
          attachmentRefs={input.attachment_refs}
          conversationAttachments={conversationAttachments}
          actorFilter={[ATTACHMENT_REF_ACTOR.agent, ATTACHMENT_REF_ACTOR.system]}
        />
      </EuiFlexItem>

      {/* Fresh HITL form history (successful submissions, readonly, desaturated).
          Rendered AFTER the response: the user submitted these forms after the LLM
          generated this round's response, so they appear after the narrative. */}
      {freshFormHistory.map((step) => (
        <EuiFlexItem grow={false} key={step.step_execution_id} style={{ filter: 'grayscale(1)' }}>
          <FormPrompt
            answeredValues={step.values}
            isAnswered
            isDisabled
            onSubmit={noop}
            prompt={toHistoryFormPrompt(step)}
          />
        </EuiFlexItem>
      ))}

      {/* Optimistic history: submitted but not yet server-confirmed (desaturated).
          Positioned after fresh history since it represents the most recent submission. */}
      {pendingOptimisticForms.map(([id, { prompt, values: submittedValues }]) => (
        <EuiFlexItem grow={false} key={`optimistic-${id}`} style={{ filter: 'grayscale(1)' }}>
          <FormPrompt
            answeredValues={submittedValues}
            isAnswered
            isDisabled
            onSubmit={noop}
            prompt={prompt}
          />
        </EuiFlexItem>
      ))}

      {/* Confirmation Prompts */}
      {isAwaitingPrompt &&
        confirmationPrompts.map((prompt) => (
          <EuiFlexItem grow={false} key={prompt.id}>
            <ConfirmationPrompt
              answeredValue={promptResponses[prompt.id]?.allow}
              isAnswered={promptResponses[prompt.id] !== undefined}
              isDisabled={isHitlDisabled}
              isLoading={isResuming}
              onCancel={() => handlePromptResponse(prompt.id, false)}
              onConfirm={() => handlePromptResponse(prompt.id, true)}
              prompt={prompt}
            />
          </EuiFlexItem>
        ))}

      {/* Active Form Prompts (exclude any that have already been submitted optimistically) */}
      {inboxEnabled &&
        isAwaitingPrompt &&
        formPrompts
          .filter((prompt) => !optimisticForms.has(prompt.id))
          .map((prompt) => (
            <EuiFlexItem grow={false} key={prompt.id}>
              <FormPrompt
                isDisabled={isHitlDisabled}
                isLoading={isResuming}
                onSubmit={handleFormSubmit}
                prompt={prompt}
              />
            </EuiFlexItem>
          ))}

      {/* Add spacing after the final round so that text is not cut off by the scroll mask */}
      {isCurrentRound && <EuiSpacer size="l" />}
    </EuiFlexGroup>
  );
};

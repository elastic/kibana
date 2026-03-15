/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { ConversationRound } from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import { ConversationRoundStatus } from '@kbn/agent-builder-common';
import { isConfirmationPrompt } from '@kbn/agent-builder-common/agents';
import { RoundInput } from './round_input';
import { RoundThinking } from './round_thinking/round_thinking';
import { RoundResponse } from './round_response/round_response';
import { useSendMessage } from '../../../context/send_message/send_message_context';
import { RoundError } from './round_error/round_error';
import { ConfirmationPrompt } from './round_prompt';
import { RoundAttachmentReferences } from './round_attachment_references';

interface RoundLayoutProps {
  isCurrentRound: boolean;
  scrollContainerHeight: number;
  rawRound: ConversationRound;
  conversationAttachments?: VersionedAttachment[];
  conversationId?: string;
}

const labels = {
  container: i18n.translate('xpack.agentBuilder.round.container', {
    defaultMessage: 'Conversation round',
  }),
};

export const RoundLayout: React.FC<RoundLayoutProps> = ({
  isCurrentRound,
  scrollContainerHeight,
  rawRound,
  conversationAttachments,
  conversationId,
}) => {
  const [roundContainerMinHeight, setRoundContainerMinHeight] = useState(0);
  const [hasBeenLoading, setHasBeenLoading] = useState(false);
  const [promptResponses, setPromptResponses] = useState<Record<string, { allow: boolean }>>({});
  const { steps, response, input, status, pending_prompts: pendingPrompts } = rawRound;

  const {
    isResponseLoading,
    error,
    retry: retrySendMessage,
    resumeRound,
    isResuming,
  } = useSendMessage();

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

  const confirmationPrompts = useMemo(
    () => (pendingPrompts ?? []).filter(isConfirmationPrompt),
    [pendingPrompts]
  );

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

  // Track if this round has ever been in a loading state during this session
  useEffect(() => {
    if (isCurrentRound && isResponseLoading) {
      setHasBeenLoading(true);
    }
  }, [isCurrentRound, isResponseLoading]);

  useEffect(() => {
    // Keep min-height if:
    // - Round is loading, errored, or awaiting prompt
    // - Round has finished streaming but is still the current round (hasBeenLoading)
    // Remove min-height when a new round starts (isCurrentRound becomes false)
    const shouldHaveMinHeight =
      isErrorCurrentRound ||
      isAwaitingPrompt ||
      (isCurrentRound && (isResponseLoading || hasBeenLoading));

    setRoundContainerMinHeight(shouldHaveMinHeight ? scrollContainerHeight : 0);
  }, [
    isCurrentRound,
    isResponseLoading,
    hasBeenLoading,
    scrollContainerHeight,
    isErrorCurrentRound,
    isAwaitingPrompt,
  ]);

  const roundContainerStyles = css`
    ${roundContainerMinHeight > 0 ? `min-height: ${roundContainerMinHeight}px;` : 'flex-grow: 0;'};
  `;
  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="m"
      aria-label={labels.container}
      css={roundContainerStyles}
    >
      {/* Input Message */}
      <EuiFlexItem grow={false}>
        <RoundInput
          input={input.message}
          attachmentRefs={input.attachment_refs}
          conversationAttachments={conversationAttachments}
          fallbackAttachments={input.attachments}
        />
      </EuiFlexItem>

      {/* Thinking - treat awaiting prompt as loading to show last reasoning event */}
      <EuiFlexItem grow={false}>
        {isErrorCurrentRound ? (
          <RoundError error={error} errorSteps={rawRound.steps} onRetry={retrySendMessage} />
        ) : (
          <RoundThinking
            steps={steps}
            isLoading={isLoadingCurrentRound || Boolean(isAwaitingPrompt)}
            rawRound={rawRound}
          />
        )}
      </EuiFlexItem>

      {/* Confirmation Prompts */}
      {isAwaitingPrompt &&
        confirmationPrompts.map((prompt) => (
          <EuiFlexItem grow={false} key={prompt.id}>
            <ConfirmationPrompt
              prompt={prompt}
              onConfirm={() => handlePromptResponse(prompt.id, true)}
              onCancel={() => handlePromptResponse(prompt.id, false)}
              isLoading={isResuming}
              isAnswered={promptResponses[prompt.id] !== undefined}
              answeredValue={promptResponses[prompt.id]?.allow}
            />
          </EuiFlexItem>
        ))}

      {/* Response Message - hidden when awaiting confirmation */}
      {!isAwaitingPrompt && (
        <EuiFlexItem grow={false}>
          <EuiFlexItem>
            <RoundResponse
              hasError={isErrorCurrentRound}
              response={response}
              steps={steps}
              isLoading={isLoadingCurrentRound}
              isLastRound={isCurrentRound}
              conversationAttachments={conversationAttachments}
              attachmentRefs={input.attachment_refs}
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
      )}

      {/* Add spacing after the final round so that text is not cut off by the scroll mask */}
      {isCurrentRound && <EuiSpacer size="l" />}
    </EuiFlexGroup>
  );
};

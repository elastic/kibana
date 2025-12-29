/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useEffect, useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import type { ConversationRound } from '@kbn/agent-builder-common';
import { ConversationRoundStatus } from '@kbn/agent-builder-common';
import { isConfirmationPrompt } from '@kbn/agent-builder-common/agents';
import { RoundInput } from './round_input';
import { RoundThinking } from './round_thinking/round_thinking';
import { RoundResponse } from './round_response/round_response';
import { useSendMessage } from '../../../context/send_message/send_message_context';
import { RoundError } from './round_error/round_error';
import { ConfirmationPrompt } from './round_confirmation_prompt';

interface RoundLayoutProps {
  isCurrentRound: boolean;
  scrollContainerHeight: number;
  rawRound: ConversationRound;
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
}) => {
  const [roundContainerMinHeight, setRoundContainerMinHeight] = useState(0);
  const { steps, response, input, status, pending_prompt: pendingPrompt } = rawRound;

  const {
    isResponseLoading,
    error,
    retry: retrySendMessage,
    resumeRound,
    isResuming,
  } = useSendMessage();

  const isLoadingCurrentRound = isResponseLoading && isCurrentRound;
  const isErrorCurrentRound = Boolean(error) && isCurrentRound;
  // Don't show prompt if we're already resuming (user already clicked confirm/cancel)
  // This prevents the prompt from reappearing when server data is refetched
  const isAwaitingPrompt =
    isCurrentRound &&
    status === ConversationRoundStatus.awaitingPrompt &&
    pendingPrompt &&
    !isResuming;

  const handleConfirm = useCallback(() => {
    resumeRound({ confirm: true });
  }, [resumeRound]);

  const handleCancel = useCallback(() => {
    resumeRound({ confirm: false });
  }, [resumeRound]);

  useEffect(() => {
    // Pending rounds and error rounds should have a min-height to match the scroll container height
    if ((isCurrentRound && isResponseLoading) || isErrorCurrentRound || isAwaitingPrompt) {
      setRoundContainerMinHeight(scrollContainerHeight);
    } else {
      setRoundContainerMinHeight(0);
    }
  }, [
    isCurrentRound,
    isResponseLoading,
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
        <RoundInput input={input.message} attachments={input.attachments} />
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

      {/* Confirmation Prompt */}
      {isAwaitingPrompt && isConfirmationPrompt(pendingPrompt) && (
        <EuiFlexItem grow={false}>
          <ConfirmationPrompt
            prompt={pendingPrompt}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            isLoading={isResuming}
          />
        </EuiFlexItem>
      )}

      {/* Response Message - hidden when awaiting confirmation */}
      {!isAwaitingPrompt && (
        <EuiFlexItem grow={false}>
          <EuiFlexItem>
            <RoundResponse
              hasError={isErrorCurrentRound}
              response={response}
              steps={steps}
              isLoading={isLoadingCurrentRound}
            />
          </EuiFlexItem>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

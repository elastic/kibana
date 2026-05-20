/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingElastic } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { AssistantResponse, ConversationRoundStep } from '@kbn/agent-builder-common';
import type {
  VersionedAttachment,
  AttachmentVersionRef,
} from '@kbn/agent-builder-common/attachments';
import React from 'react';
import { StreamingText } from './streaming_text';
import { ChatMessageText } from './chat_message_text';
import { RoundResponseActions } from './round_response_actions';
import { StepItem } from '../round_events/step_item';

export interface RoundResponseProps {
  response: AssistantResponse;
  steps: ConversationRoundStep[];
  isLoading: boolean;
  hasError: boolean;
  isLastRound: boolean;
  latestStep?: ConversationRoundStep;
  conversationAttachments?: VersionedAttachment[];
  attachmentRefs?: AttachmentVersionRef[];
  conversationId?: string;
}

export const RoundResponse: React.FC<RoundResponseProps> = ({
  hasError,
  response,
  steps,
  isLoading,
  isLastRound,
  latestStep,
  conversationAttachments,
  attachmentRefs,
  conversationId,
}) => {
  const hasMessage = Boolean(response.message);

  // Render precedence. Mutually exclusive — `latestStep` is computed in
  // `RoundLayout` to be {undefined} whenever `hasMessage` is true, so the
  // streaming-text and live-step branches can never both be true at once.
  //   1. Streaming text chunks are filling the buffer → {StreamingText}
  //      (text_chunk content is always shown live).
  //   2. A step is the latest event → render the full {StepItem} inline,
  //      clickable to expand into its sub-fields just like in the events
  //      panel above. When another event becomes the latest, this same step
  //      moves up into the panel and its local expansion state resets on
  //      remount.
  //   3. Round complete → {ChatMessageText} with the final answer.
  //   4. Otherwise (very initial moment, no chunks, no steps) → nothing.
  const showStreamingText = isLoading && hasMessage;
  const liveStep = isLoading ? latestStep : undefined;
  const showCompletedAnswer = !isLoading;

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="m"
      aria-label={i18n.translate('xpack.agentBuilder.round.assistantResponse', {
        defaultMessage: 'Assistant response',
      })}
      data-test-subj="agentBuilderRoundResponse"
      css={css`
        position: relative;
      `}
    >
      <EuiFlexItem>
        {showStreamingText ? (
          <StreamingText
            content={response.message}
            steps={steps}
            conversationAttachments={conversationAttachments}
            attachmentRefs={attachmentRefs}
            conversationId={conversationId}
          />
        ) : liveStep ? (
          <StepItem step={liveStep} />
        ) : showCompletedAnswer ? (
          <ChatMessageText
            content={response.message}
            steps={steps}
            conversationAttachments={conversationAttachments}
            attachmentRefs={attachmentRefs}
            conversationId={conversationId}
          />
        ) : null}
      </EuiFlexItem>
      {isLoading && (
        <EuiFlexItem grow={false}>
          <EuiLoadingElastic size="l" aria-label="Streaming response" />
        </EuiFlexItem>
      )}
      {!isLoading && !hasError && (
        <EuiFlexItem grow={false}>
          <RoundResponseActions content={response.message} isVisible isLastRound={isLastRound} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

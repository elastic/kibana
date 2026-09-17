/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type {
  AssistantResponse,
  ConversationRoundStep,
  ExecutionTerminatedEvent,
} from '@kbn/agent-builder-common';
import type {
  VersionedAttachment,
  AttachmentVersionRef,
} from '@kbn/agent-builder-common/attachments';
import React from 'react';
import { StreamingText } from './streaming_text';
import { ChatMessageText } from './chat_message_text';
import { ResponseActions } from './response_actions';

export interface ResponseMessageProps {
  response: AssistantResponse;
  steps: ConversationRoundStep[];
  isLoading: boolean;
  hasError: boolean;
  conversationAttachments?: VersionedAttachment[];
  attachmentRefs?: AttachmentVersionRef[];
  conversationId?: string;
  executionTerminatedEvent?: ExecutionTerminatedEvent;
}

export const ResponseMessage: React.FC<ResponseMessageProps> = ({
  hasError,
  response,
  steps,
  isLoading,
  conversationAttachments,
  attachmentRefs,
  conversationId,
  executionTerminatedEvent,
}) => {
  const hasMessage = Boolean(response.message);

  const showStreamingText = isLoading && hasMessage;
  const showCompletedAnswer = !isLoading;

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      aria-label={i18n.translate('xpack.agentBuilder.round.assistantResponse', {
        defaultMessage: 'Assistant response',
      })}
      data-test-subj="agentBuilderResponseMessage"
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
      {!isLoading && !hasError && (
        <EuiFlexItem grow={false}>
          <ResponseActions
            content={response.message}
            isVisible
            executionTerminatedEvent={executionTerminatedEvent}
            steps={steps}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

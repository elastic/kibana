/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingElastic, EuiText } from '@elastic/eui';
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
import { useConversationStream } from '../../../../hooks/use_conversation_stream';
import { lineClampStyles } from '../../../../../common.styles';

export interface RoundResponseProps {
  response: AssistantResponse;
  steps: ConversationRoundStep[];
  isLoading: boolean;
  hasError: boolean;
  isLastRound: boolean;
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
  conversationAttachments,
  attachmentRefs,
  conversationId,
}) => {
  const { agentReasoning } = useConversationStream();
  const hasMessage = Boolean(response.message);
  const showAgentReasoning = isLoading && !hasMessage && Boolean(agentReasoning);

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
        {showAgentReasoning ? (
          <EuiText size="s" color="subdued">
            <p
              css={css`
                ${lineClampStyles(1)}
                word-break: break-all;
              `}
            >
              {agentReasoning}…
            </p>
          </EuiText>
        ) : isLoading && hasMessage ? (
          <StreamingText
            content={response.message}
            steps={steps}
            conversationAttachments={conversationAttachments}
            attachmentRefs={attachmentRefs}
            conversationId={conversationId}
          />
        ) : !isLoading ? (
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
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

export interface RoundResponseProps {
  response: AssistantResponse;
  steps: ConversationRoundStep[];
  isLoading: boolean;
  hasError: boolean;
  isLastRound: boolean;
  conversationReplacementsId?: string;
  conversationAttachments?: VersionedAttachment[];
  attachmentRefs?: AttachmentVersionRef[];
  conversationId?: string;
  showAnonymized?: boolean;
}

export const RoundResponse: React.FC<RoundResponseProps> = ({
  hasError,
  response: { message, replacements_id: responseReplacementsId },
  steps,
  isLoading,
  isLastRound,
  conversationReplacementsId,
  conversationAttachments,
  attachmentRefs,
  conversationId,
  showAnonymized = false,
}) => {
  // Conversation-level replacementsId is authoritative for 3a continuity and
  // can outlive earlier round-level IDs from intermediate plumbing iterations.
  const replacementsId = conversationReplacementsId ?? responseReplacementsId;

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
        {isLoading ? (
          <StreamingText
            content={message}
            steps={steps}
            replacementsId={replacementsId}
            conversationAttachments={conversationAttachments}
            attachmentRefs={attachmentRefs}
            conversationId={conversationId}
            showAnonymized={showAnonymized}
          />
        ) : (
          <ChatMessageText
            content={message}
            steps={steps}
            replacementsId={replacementsId}
            conversationAttachments={conversationAttachments}
            attachmentRefs={attachmentRefs}
            conversationId={conversationId}
            showAnonymized={showAnonymized}
          />
        )}
      </EuiFlexItem>
      {!isLoading && !hasError && (
        <EuiFlexItem grow={false}>
          <RoundResponseActions content={message} isVisible isLastRound={isLastRound} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

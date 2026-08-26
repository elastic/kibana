/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type {
  ConversationRoundStep,
  ReasoningStep as ReasoningStepData,
} from '@kbn/agent-builder-common/chat/conversation';
import type {
  VersionedAttachment,
  AttachmentVersionRef,
} from '@kbn/agent-builder-common/attachments';
import { StepLayout } from '../step_layout';
import { ChatMessageText } from '../../round_response/chat_message_text';

interface ReasoningStepProps {
  step: ReasoningStepData;
  steps: ConversationRoundStep[];
  conversationAttachments?: VersionedAttachment[];
  attachmentRefs?: AttachmentVersionRef[];
  conversationId?: string;
}

export const ReasoningStep: React.FC<ReasoningStepProps> = ({
  step,
  steps,
  conversationAttachments,
  attachmentRefs,
  conversationId,
}) => (
  <StepLayout
    label={
      <ChatMessageText
        content={step.reasoning}
        steps={steps}
        conversationAttachments={conversationAttachments}
        attachmentRefs={attachmentRefs}
        conversationId={conversationId}
        isStreaming={false}
      />
    }
  />
);

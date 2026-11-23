/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type {
  ConversationRoundStep,
  InterimAnswerStep as InterimAnswerStepData,
} from '@kbn/agent-builder-common/chat/conversation';
import type {
  VersionedAttachment,
  AttachmentVersionRef,
} from '@kbn/agent-builder-common/attachments';
import { ChatMessageText } from '../../response/chat_message_text';

interface InterimAnswerStepProps {
  step: InterimAnswerStepData;
  steps: ConversationRoundStep[];
  conversationAttachments?: VersionedAttachment[];
  attachmentRefs?: AttachmentVersionRef[];
  conversationId?: string;
}

export const InterimAnswerStep: React.FC<InterimAnswerStepProps> = ({
  step,
  steps,
  conversationAttachments,
  attachmentRefs,
  conversationId,
}) => (
  <div data-test-subj="agentBuilderInterimAnswerStep">
    <ChatMessageText
      content={step.message}
      steps={steps}
      conversationAttachments={conversationAttachments}
      attachmentRefs={attachmentRefs}
      conversationId={conversationId}
    />
  </div>
);

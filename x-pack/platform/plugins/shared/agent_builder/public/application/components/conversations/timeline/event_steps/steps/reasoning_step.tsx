/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useBoolean } from '@kbn/react-hooks';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import type {
  ConversationRoundStep,
  ReasoningStep as ReasoningStepData,
} from '@kbn/agent-builder-common/chat/conversation';
import type {
  VersionedAttachment,
  AttachmentVersionRef,
} from '@kbn/agent-builder-common/attachments';
import { StepLayout } from '../step_layout';
import { ChatMessageText } from '../../response/chat_message_text';
import { ModelReasoningText, findToolCallGroupModelReasoning } from './model_reasoning_step';

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
}) => {
  const [isModelReasoningShown, { toggle: toggleModelReasoning }] = useBoolean(false);

  // The line expands only when the model's own reasoning came with it.
  const modelReasoning =
    step.tool_call_group_id !== undefined
      ? findToolCallGroupModelReasoning(steps, step.tool_call_group_id)
      : undefined;

  return (
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
      onClick={modelReasoning && toggleModelReasoning}
      isExpanded={isModelReasoningShown}
      expansion={modelReasoning && <ModelReasoningText step={modelReasoning} />}
      ebtAction={AGENT_BUILDER_UI_EBT.action.conversation.EXPAND_MODEL_REASONING}
    />
  );
};

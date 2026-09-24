/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type {
  AssistantResponse,
  ConversationRoundStep,
  ExecutionTerminatedEvent,
} from '@kbn/agent-builder-common';
import type {
  AttachmentVersionRef,
  VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import { useConversationId } from '../../../context/conversation/use_conversation_id';
import { ResponseMessage } from './response/response_message';
import { EventSteps } from './event_steps/event_steps';
import { AttachmentReferences } from './attachments/attachment_references';

interface AgentResponseProps {
  steps: ConversationRoundStep[];
  response: AssistantResponse;
  isLoading: boolean;
  /** The event that ended the execution; omitted while streaming, when the actions are hidden. */
  executionTerminatedEvent?: ExecutionTerminatedEvent;
  conversationAttachments?: VersionedAttachment[];
  /** Highest version of every attachment referenced up to this turn; resolves rendered attachments. */
  attachmentRefs?: AttachmentVersionRef[];
  /** The trigger message's refs; the agent's and system's entries are listed under the response. */
  triggerAttachmentRefs?: AttachmentVersionRef[];
}

/** The assistant's turn: shared presenter for both the finished run and the in-flight one. */
export const AgentResponse: React.FC<AgentResponseProps> = ({
  steps,
  response,
  isLoading,
  executionTerminatedEvent,
  conversationAttachments,
  attachmentRefs,
  triggerAttachmentRefs,
}) => {
  const conversationId = useConversationId();

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {steps.length > 0 && (
        <EuiFlexItem grow={false}>
          <EventSteps
            steps={steps}
            conversationAttachments={conversationAttachments}
            attachmentRefs={attachmentRefs}
            conversationId={conversationId}
          />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <ResponseMessage
          response={response}
          steps={steps}
          isLoading={isLoading}
          executionTerminatedEvent={executionTerminatedEvent}
          conversationAttachments={conversationAttachments}
          attachmentRefs={attachmentRefs}
          conversationId={conversationId}
        />
      </EuiFlexItem>
      {!isLoading && (
        <AttachmentReferences
          attachmentRefs={triggerAttachmentRefs}
          conversationAttachments={conversationAttachments}
          actorFilter={[ATTACHMENT_REF_ACTOR.agent, ATTACHMENT_REF_ACTOR.system]}
        />
      )}
    </EuiFlexGroup>
  );
};

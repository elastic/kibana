import React from 'react';
import type { ConversationRoundStep, ReasoningStep as ReasoningStepData } from '@kbn/agent-builder-common/chat/conversation';
import type { VersionedAttachment, AttachmentVersionRef } from '@kbn/agent-builder-common/attachments';
interface ReasoningStepProps {
    step: ReasoningStepData;
    steps: ConversationRoundStep[];
    conversationAttachments?: VersionedAttachment[];
    attachmentRefs?: AttachmentVersionRef[];
    conversationId?: string;
}
export declare const ReasoningStep: React.FC<ReasoningStepProps>;
export {};

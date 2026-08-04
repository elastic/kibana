import React from 'react';
import type { ConversationRoundStep } from '@kbn/agent-builder-common/chat/conversation';
import type { VersionedAttachment, AttachmentVersionRef } from '@kbn/agent-builder-common/attachments';
interface StepItemProps {
    step: ConversationRoundStep;
    steps: ConversationRoundStep[];
    conversationAttachments?: VersionedAttachment[];
    attachmentRefs?: AttachmentVersionRef[];
    conversationId?: string;
}
export declare const StepItem: React.FC<StepItemProps>;
export {};

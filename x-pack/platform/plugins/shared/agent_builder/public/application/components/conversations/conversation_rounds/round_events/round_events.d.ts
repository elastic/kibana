import React from 'react';
import type { ConversationRoundStep } from '@kbn/agent-builder-common/chat/conversation';
import type { VersionedAttachment, AttachmentVersionRef } from '@kbn/agent-builder-common/attachments';
interface RoundEventsProps {
    steps: ConversationRoundStep[];
    conversationAttachments?: VersionedAttachment[];
    attachmentRefs?: AttachmentVersionRef[];
    conversationId?: string;
}
export declare const RoundEvents: React.FC<RoundEventsProps>;
export {};

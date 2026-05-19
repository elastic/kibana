import React from 'react';
import type { ConversationRoundStep } from '@kbn/agent-builder-common';
import type { VersionedAttachment, AttachmentVersionRef } from '@kbn/agent-builder-common/attachments';
interface StreamingTextProps {
    content: string;
    steps: ConversationRoundStep[];
    tokenDelay?: number;
    conversationAttachments?: VersionedAttachment[];
    attachmentRefs?: AttachmentVersionRef[];
    conversationId?: string;
}
export declare const StreamingText: ({ content, steps, tokenDelay, conversationAttachments, attachmentRefs, conversationId, }: StreamingTextProps) => React.JSX.Element;
export {};

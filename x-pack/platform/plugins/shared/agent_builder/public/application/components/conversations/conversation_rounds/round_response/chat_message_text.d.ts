import React from 'react';
import type { ConversationRoundStep } from '@kbn/agent-builder-common';
import type { VersionedAttachment, AttachmentVersionRef } from '@kbn/agent-builder-common/attachments';
interface Props {
    content: string;
    steps: ConversationRoundStep[];
    conversationAttachments?: VersionedAttachment[];
    attachmentRefs?: AttachmentVersionRef[];
    conversationId?: string;
    isStreaming?: boolean;
}
/**
 * Component handling markdown support to the assistant's responses.
 * Also handles "loading" state by appending the blinking cursor.
 */
export declare function ChatMessageText({ content, steps: stepsFromCurrentRound, conversationAttachments, attachmentRefs, conversationId, isStreaming, }: Props): React.JSX.Element;
export {};

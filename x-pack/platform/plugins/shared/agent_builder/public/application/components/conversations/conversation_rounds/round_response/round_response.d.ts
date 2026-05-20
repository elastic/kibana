import type { AssistantResponse, ConversationRoundStep } from '@kbn/agent-builder-common';
import type { VersionedAttachment, AttachmentVersionRef } from '@kbn/agent-builder-common/attachments';
import React from 'react';
export interface RoundResponseProps {
    response: AssistantResponse;
    steps: ConversationRoundStep[];
    isLoading: boolean;
    hasError: boolean;
    isLastRound: boolean;
    conversationAttachments?: VersionedAttachment[];
    attachmentRefs?: AttachmentVersionRef[];
    conversationId?: string;
}
export declare const RoundResponse: React.FC<RoundResponseProps>;

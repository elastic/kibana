import React from 'react';
import type { Attachment, AttachmentVersionRef, VersionedAttachment } from '@kbn/agent-builder-common/attachments';
interface RoundInputProps {
    input: string;
    attachmentRefs?: AttachmentVersionRef[];
    conversationAttachments?: VersionedAttachment[];
    fallbackAttachments?: Attachment[];
}
export declare const RoundInput: ({ input, attachmentRefs, conversationAttachments, fallbackAttachments, }: RoundInputProps) => React.JSX.Element;
export {};

import type { Attachment, VersionedAttachment, AttachmentInput, AttachmentVersionRef } from '@kbn/agent-builder-common/attachments';
export declare const buildOptimisticAttachments: ({ attachments, conversationAttachments, }: {
    attachments?: AttachmentInput[];
    conversationAttachments?: VersionedAttachment[];
}) => {
    fallbackAttachments: Attachment[];
    attachmentRefs: AttachmentVersionRef[];
};

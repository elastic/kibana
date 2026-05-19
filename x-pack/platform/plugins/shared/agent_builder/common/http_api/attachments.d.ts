import type { VersionedAttachment } from '@kbn/agent-builder-common';
import type { AttachmentStaleCheckResult } from '@kbn/agent-builder-common/attachments';
export interface ListAttachmentsResponse {
    results: VersionedAttachment[];
    total_token_estimate: number;
}
export interface CreateAttachmentResponse {
    attachment: VersionedAttachment;
}
export interface UpdateAttachmentResponse {
    attachment: VersionedAttachment;
    new_version: number;
}
export interface DeleteAttachmentResponse {
    success: boolean;
    permanent: boolean;
}
export interface RestoreAttachmentResponse {
    success: boolean;
    attachment: VersionedAttachment;
}
export interface RenameAttachmentResponse {
    success: boolean;
    attachment: VersionedAttachment;
}
export interface CheckStaleAttachmentsResponse {
    attachments: AttachmentStaleCheckResult[];
}

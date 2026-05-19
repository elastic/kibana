import type { CommentAttachmentData } from '../../../common/types/domain_zod/attachment/comment/v2';
import type { UnifiedAttachmentTypeSetup } from '../types';
export declare const commentAttachmentType: UnifiedAttachmentTypeSetup;
export type { CommentAttachmentData };
/** Decodes the `data` slice for SO transformer / read paths that don't have the full payload. */
export declare const decodeCommentAttachmentData: (data: unknown) => CommentAttachmentData;

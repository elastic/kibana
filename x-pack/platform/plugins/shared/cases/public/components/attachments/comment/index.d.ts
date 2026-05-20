/**
 * Returns the comment (user) attachment type for registration with the unified registry.
 * Renders comment body via CommentChildren and uses CommentTimelineAvatar.
 */
export declare const getCommentAttachmentType: () => import("../../../client/attachment_framework/types").UnifiedValueAttachmentType<{
    [x: string]: import("@kbn/utility-types").JsonValue;
}>;

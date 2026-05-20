import React from 'react';
import type { CaseUser } from '../../../../common/ui/types';
export interface CommentTimelineAvatarProps {
    createdBy?: CaseUser;
}
/**
 * Renders a user avatar for a comment.
 */
export declare const CommentTimelineAvatar: React.FC<CommentTimelineAvatarProps>;

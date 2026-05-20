import React from 'react';
export interface CommentActionsProps {
    commentId: string;
    content: string;
}
/**
 * Renders a toolbar with actions for a comment.
 */
export declare const CommentActions: React.FC<CommentActionsProps>;

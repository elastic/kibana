import React from 'react';
export interface CommentChildrenProps {
    commentId: string;
    content: string;
    caseId: string;
    version: string;
}
/**
 * Renders the content of a comment.
 */
export declare const CommentChildren: React.FC<CommentChildrenProps>;

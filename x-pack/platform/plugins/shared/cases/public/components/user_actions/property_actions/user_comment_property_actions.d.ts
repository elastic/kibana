import React from 'react';
interface Props {
    isLoading: boolean;
    commentContent?: string;
    onEdit: () => void;
    onDelete: () => void;
    onQuote: () => void;
}
export declare const UserCommentPropertyActions: React.NamedExoticComponent<Props>;
export {};

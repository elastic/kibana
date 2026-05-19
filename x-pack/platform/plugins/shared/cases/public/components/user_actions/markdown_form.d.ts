import React from 'react';
interface UserActionMarkdownProps {
    content: string;
    id: string;
    caseId: string;
    isEditable: boolean;
    onChangeEditable: (id: string) => void;
    onSaveContent: (content: string) => void;
}
export interface UserActionMarkdownRefObject {
    setComment: (newComment: string) => void;
}
export declare const UserActionMarkdown: React.MemoExoticComponent<React.ForwardRefExoticComponent<UserActionMarkdownProps & React.RefAttributes<UserActionMarkdownRefObject>>>;
export {};

import React from 'react';
import type { CaseUI } from '../../containers/types';
import type { MarkdownEditorRef } from '../markdown_editor';
export interface AddCommentRefObject {
    addQuote: (quote: string) => void;
    setComment: (newComment: string) => void;
    editor: MarkdownEditorRef | null;
}
export interface AddCommentProps {
    id: string;
    caseId: string;
    onCommentSaving?: () => void;
    onCommentPosted: (newCase: CaseUI) => void;
    showLoading?: boolean;
    statusActionButton: JSX.Element | null;
}
export declare const AddComment: React.MemoExoticComponent<React.ForwardRefExoticComponent<AddCommentProps & React.RefAttributes<AddCommentRefObject>>>;

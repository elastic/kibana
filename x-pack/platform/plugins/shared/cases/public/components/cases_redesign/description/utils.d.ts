import type { EditableMarkdownRefObject } from '../../markdown_editor';
export declare const getDescriptionPreview: (description: string) => string;
export declare const getDraftDescription: (applicationId: string | undefined, caseId: string, commentId: string) => string | null;
export declare const isCommentRef: (ref: EditableMarkdownRefObject | null | undefined) => ref is EditableMarkdownRefObject;

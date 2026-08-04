import type { EuiMarkdownAstNodePosition } from '@elastic/eui';
import type { MarkdownEditorRef } from '../../types';
interface DraftComment {
    commentId: string;
    comment: string;
    position: EuiMarkdownAstNodePosition;
    caseTitle?: string;
    caseTags?: string[];
}
export declare const useLensDraftComment: () => {
    draftComment: DraftComment | null;
    hasIncomingLensState: boolean;
    openLensModal: ({ editorRef }: {
        editorRef: MarkdownEditorRef;
    }) => void;
    clearDraftComment: () => void;
};
export {};

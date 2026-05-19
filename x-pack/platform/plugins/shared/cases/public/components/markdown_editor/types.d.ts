import type { ContextShape } from '@elastic/eui/src/components/markdown_editor/markdown_context';
export interface CursorPosition {
    start: number;
    end: number;
}
export interface MarkdownEditorRef {
    textarea: HTMLTextAreaElement | null;
    replaceNode: ContextShape['replaceNode'];
    toolbar: HTMLDivElement | null;
}
export interface EditorBaseProps {
    ariaLabel: string;
    'data-test-subj': string;
    editorId: string;
    disabledUiPlugins?: string[];
    errors?: Array<string | Error>;
}

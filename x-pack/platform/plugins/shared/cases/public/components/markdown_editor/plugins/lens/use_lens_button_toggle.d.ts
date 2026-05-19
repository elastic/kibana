import type { ContextShape } from '@elastic/eui/src/components/markdown_editor/markdown_context';
import type { EuiMarkdownAstNode, EuiMarkdownEditorUiPlugin } from '@elastic/eui';
interface MarkdownEditorRef {
    textarea: HTMLTextAreaElement | null;
    replaceNode: ContextShape['replaceNode'];
    toolbar: HTMLDivElement | null;
}
interface UseLensButtonToggleProps {
    astRef?: React.MutableRefObject<EuiMarkdownAstNode | undefined>;
    uiPlugins?: EuiMarkdownEditorUiPlugin[] | undefined;
    editorRef?: React.MutableRefObject<MarkdownEditorRef | null>;
    value?: string;
}
export declare const useLensButtonToggle: ({ astRef, editorRef, uiPlugins, value, }: UseLensButtonToggleProps) => void;
export {};

import type { EditableMarkdownRefObject, MarkdownEditorRef } from '../../markdown_editor';
export interface DescriptionMarkdownRefObject extends EditableMarkdownRefObject {
    editor: MarkdownEditorRef | null;
}

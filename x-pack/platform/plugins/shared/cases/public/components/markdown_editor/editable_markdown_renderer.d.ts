import React from 'react';
import type { FormSchema } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
export interface EditableMarkdownRefObject {
    setComment: (newComment: string) => void;
}
interface EditableMarkdownRendererProps {
    content: string;
    id: string;
    caseId: string;
    fieldName: string;
    onChangeEditable: (id: string) => void;
    onSaveContent: (content: string) => void;
    editorRef: React.MutableRefObject<undefined | null | EditableMarkdownRefObject>;
    formSchema: FormSchema<{
        content: string;
    }> | undefined;
}
export declare const EditableMarkdown: React.MemoExoticComponent<React.ForwardRefExoticComponent<EditableMarkdownRendererProps & React.RefAttributes<EditableMarkdownRefObject>>>;
export {};

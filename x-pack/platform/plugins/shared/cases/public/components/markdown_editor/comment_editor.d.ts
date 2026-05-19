import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import React from 'react';
import { type MarkdownEditorRef, type EditorBaseProps } from './types';
/** Shared props required by both editor variants */
interface Props extends EditorBaseProps {
    field: FieldHook<string>;
    caseId?: string;
    onChange: (value: string) => void;
    value: string;
    /** any additional props accepted by the underlying editor components */
    [key: string]: unknown;
}
/**
 * Returns the correct editor (with or without file-paste support) based on the
 * presence of the FilesContext and a `caseId`.
 *
 * This lets higher-level forms stay unaware of the internal branching logic.
 */
export declare const CommentEditor: React.ForwardRefExoticComponent<Omit<Props, "ref"> & React.RefAttributes<MarkdownEditorRef>>;
export {};

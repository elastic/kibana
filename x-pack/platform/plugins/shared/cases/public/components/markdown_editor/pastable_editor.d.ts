import React from 'react';
import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { type Owner } from '../../../common/constants/types';
import { type EditorBaseProps, type MarkdownEditorRef } from './types';
interface PastableMarkdownEditorProps extends EditorBaseProps {
    field: FieldHook<string>;
    caseId: string;
    owner: Owner;
}
export declare const PastableMarkdownEditor: React.MemoExoticComponent<React.ForwardRefExoticComponent<PastableMarkdownEditorProps & React.RefAttributes<MarkdownEditorRef>>>;
export {};

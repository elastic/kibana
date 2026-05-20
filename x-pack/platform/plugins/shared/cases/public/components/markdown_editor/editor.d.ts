import type { ElementRef } from 'react';
import React from 'react';
import { EuiMarkdownEditor } from '@elastic/eui';
import { type EditorBaseProps, type MarkdownEditorRef } from './types';
interface MarkdownEditorProps extends EditorBaseProps {
    height?: number;
    onChange: (content: string) => void;
    value: string;
}
export type EuiMarkdownEditorRef = ElementRef<typeof EuiMarkdownEditor>;
export declare const MarkdownEditor: React.MemoExoticComponent<React.ForwardRefExoticComponent<MarkdownEditorProps & React.RefAttributes<MarkdownEditorRef>>>;
export {};

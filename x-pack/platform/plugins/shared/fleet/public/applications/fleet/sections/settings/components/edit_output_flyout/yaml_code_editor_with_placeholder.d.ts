import React from 'react';
import { type CodeEditorProps } from '@kbn/code-editor';
export type YamlCodeEditorWithPlaceholderProps = Pick<CodeEditorProps, 'value' | 'onChange'> & {
    placeholder: string;
    disabled?: boolean;
};
export declare const YamlCodeEditorWithPlaceholder: React.FunctionComponent<YamlCodeEditorWithPlaceholderProps>;

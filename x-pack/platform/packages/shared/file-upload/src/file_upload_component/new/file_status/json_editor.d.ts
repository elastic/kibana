import type { FC } from 'react';
import { type CodeEditorProps } from '@kbn/code-editor';
export declare const EDITOR_MODE: {
    TEXT: string;
    JSON: string;
};
interface JobEditorProps {
    value: string;
    height?: string;
    width?: string;
    mode?: (typeof EDITOR_MODE)[keyof typeof EDITOR_MODE];
    readOnly?: boolean;
    onChange?: CodeEditorProps['onChange'];
    transparentBackground?: boolean;
}
export declare const JsonEditor: FC<JobEditorProps>;
export {};

import type { FC } from 'react';
import { type CodeEditorProps } from '@kbn/code-editor';
export declare const ML_EDITOR_MODE: {
    TEXT: string;
    JSON: string;
    XJSON: string;
};
interface MlJobEditorProps {
    value: string;
    height?: string;
    width?: string;
    mode?: (typeof ML_EDITOR_MODE)[keyof typeof ML_EDITOR_MODE];
    readOnly?: boolean;
    onChange?: CodeEditorProps['onChange'];
    'data-test-subj'?: string;
    schema?: object;
}
export declare const MLJobEditor: FC<MlJobEditorProps>;
export {};

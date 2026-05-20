import type { FunctionComponent } from 'react';
import type { FieldHook } from '../../../../../../shared_imports';
interface Props {
    field: FieldHook<string>;
    editorProps: {
        [key: string]: any;
    };
    euiFieldProps?: Record<string, any>;
}
export declare const TextEditor: FunctionComponent<Props>;
export {};

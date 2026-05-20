import type { FunctionComponent } from 'react';
import type { FieldHook } from '../../../../../../shared_imports';
interface Props {
    field: FieldHook<string>;
    editorProps: {
        [key: string]: any;
    };
    disabled?: boolean;
}
export declare const XJsonEditor: FunctionComponent<Props>;
export {};

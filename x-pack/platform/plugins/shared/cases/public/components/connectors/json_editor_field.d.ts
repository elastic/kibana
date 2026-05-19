import React from 'react';
import { type FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
interface Props {
    field: FieldHook<unknown, string>;
    paramsProperty: string;
    ariaLabel?: string;
    onBlur?: () => void;
    dataTestSubj?: string;
    euiCodeEditorProps?: {
        [key: string]: unknown;
    };
}
export declare const JsonEditorField: React.FunctionComponent<Props>;
export {};

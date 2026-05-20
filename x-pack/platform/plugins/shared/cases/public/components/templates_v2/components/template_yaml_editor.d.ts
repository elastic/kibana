import React from 'react';
import { monaco } from '@kbn/monaco';
import type { ValidationError } from './template_yaml_validation_accordion';
interface TemplateYamlEditorBaseProps {
    value: string;
    onChange: (value: string) => void;
    schemas: Array<{
        uri: string;
        fileMatch: string[];
        schema: unknown;
    }>;
    onValidationChange?: (errors: ValidationError[]) => void;
    onEditorMount?: (isMounted: boolean, editor?: monaco.editor.IStandaloneCodeEditor) => void;
}
export declare const TemplateYamlEditorBase: React.FC<TemplateYamlEditorBaseProps>;
export {};

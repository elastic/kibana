import React from 'react';
interface FieldDefinitionYamlEditorProps {
    value: string;
    onChange: (value: string) => void;
    height?: number;
    'data-test-subj'?: string;
}
export declare const FieldDefinitionYamlEditor: React.FC<FieldDefinitionYamlEditorProps>;
export {};

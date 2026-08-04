import React from 'react';
export interface YamlEditorFormValues {
    definition: string;
}
export interface TemplateYamlEditorProps {
    value: string;
    onChange: (value: string) => void;
    isSaving?: boolean;
    isSaved?: boolean;
    savedValue?: string;
}
export declare const TemplateYamlEditor: {
    ({ value, onChange, isSaving, isSaved, savedValue, }: TemplateYamlEditorProps): React.JSX.Element;
    displayName: string;
};

import React from 'react';
interface TemplateEditorLayoutProps {
    isLoading?: boolean;
    yamlValue: string;
    onYamlChange: (value: string) => void;
    onFieldDefaultChange?: (fieldName: string, value: string, control: string) => void;
    isYamlSaving: boolean;
    isYamlSaved: boolean;
    previewWidth: number;
    onPreviewWidthChange: (width: number) => void;
    currentTemplateId?: string;
}
export declare const TemplateEditorLayout: React.FC<TemplateEditorLayoutProps>;
export {};

import React from 'react';
export interface ValidationError {
    message: string;
    severity: 'error' | 'warning';
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
}
interface TemplateYamlValidationAccordionProps {
    isMounted: boolean;
    validationErrors: ValidationError[] | null;
    onErrorClick?: (error: ValidationError) => void;
}
export declare const TemplateYamlValidationAccordion: React.FC<TemplateYamlValidationAccordionProps>;
export {};

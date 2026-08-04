import React from 'react';
export interface TemplateFlyoutFooterProps {
    isFirstStep: boolean;
    isLastStep: boolean;
    isNextDisabled: boolean;
    isNextLoading: boolean;
    isImportDisabled: boolean;
    isImportLoading?: boolean;
    selectedCount: number;
    onCancel: () => void;
    onBack: () => void;
    onNext: () => void;
    onImport: () => void;
}
export declare const TemplateFlyoutFooter: React.NamedExoticComponent<TemplateFlyoutFooterProps>;

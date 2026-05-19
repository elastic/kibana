import React from 'react';
interface TemplateFormHeaderProps {
    title: string;
    isLoading?: boolean;
    isSaving?: boolean;
    hasChanges: boolean;
    isEdit: boolean;
    submitError: string | null;
    isEnabled: boolean;
    onBack: () => void;
    onReset: () => void;
    onSave: () => void;
    onIsEnabledChange: (isEnabled: boolean) => void;
}
export declare const TemplateFormHeader: React.FC<TemplateFormHeaderProps>;
export {};

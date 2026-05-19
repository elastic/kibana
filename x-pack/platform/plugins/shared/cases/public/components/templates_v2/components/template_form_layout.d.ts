import React from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { YamlEditorFormValues } from './template_form';
interface TemplateFormLayoutProps {
    form: UseFormReturn<YamlEditorFormValues>;
    title: string;
    isLoading?: boolean;
    isSaving?: boolean;
    onCreate: (data: YamlEditorFormValues, isEnabled: boolean) => Promise<void>;
    isEdit?: boolean;
    storageKey: string;
    initialValue: string;
    templateId?: string;
    initialIsEnabled?: boolean;
}
export declare const TemplateFormLayout: React.FC<TemplateFormLayoutProps>;
export {};

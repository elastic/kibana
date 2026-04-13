import React from 'react';
import type { TemplateListItem as IndexTemplate } from '@kbn/index-management-shared-types';
interface SelectTemplateStepProps {
    templates: IndexTemplate[];
    selectedTemplate: string | null;
    onTemplateSelect: (templateName: string | null) => void;
    onTemplateConfirm: (templateName: string) => void;
    onCreateTemplate: () => void;
    hasErrorLoadingTemplates?: boolean;
    onRetryLoadTemplates: () => void;
}
export declare const SelectTemplateStep: ({ templates, selectedTemplate, onTemplateSelect, onTemplateConfirm, onCreateTemplate, hasErrorLoadingTemplates, onRetryLoadTemplates, }: SelectTemplateStepProps) => React.JSX.Element;
export {};

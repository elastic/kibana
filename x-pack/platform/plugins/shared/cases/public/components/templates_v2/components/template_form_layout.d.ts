import React from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { YamlEditorFormValues } from './template_form';
import type { TemplateSettings } from '../../../../common/types/domain/template/v1';
import { type TemplateMetadata } from '../utils/template_metadata';
interface TemplateFormLayoutProps {
    form: UseFormReturn<YamlEditorFormValues>;
    title: string;
    initialMetadata: TemplateMetadata;
    isLoading?: boolean;
    isSaving?: boolean;
    onCreate: (data: YamlEditorFormValues, metadata: TemplateMetadata, isEnabled: boolean) => Promise<void>;
    isEdit?: boolean;
    storageKey: string;
    initialValue: string;
    templateId?: string;
    initialIsEnabled?: boolean;
    /**
     * Default case settings for a NEW template whose definition carries no `settings` block (i.e.
     * create). Ignored once the definition has its own settings (edit / imported). Lets the create
     * page apply solution-aware defaults (e.g. sync alerts on only for Security).
     */
    initialSettings?: TemplateSettings;
}
/**
 * The full-height body offset for the template editor: the Security Solution timeline bottom-bar
 * reservation for the Security owner, otherwise none. Exported for testing.
 */
export declare const getTemplateEditorBodyOffset: (owner: string[]) => string;
export declare const TemplateFormLayout: React.FC<TemplateFormLayoutProps>;
export {};

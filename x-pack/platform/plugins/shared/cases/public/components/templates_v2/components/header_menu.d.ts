import type { AppHeaderBadge, AppHeaderMenu } from '@kbn/app-header';
import type { TemplateMetadataErrors } from '../utils/template_metadata';
interface GetTemplatesListMenuArgs {
    onImportClick: () => void;
    navigateToCasesCreateTemplate: () => void;
    getCasesCreateTemplateUrl: () => string;
    navigateToCasesFieldLibrary: () => void;
    getCasesFieldLibraryUrl: () => string;
}
export declare const getTemplatesListMenu: ({ onImportClick, navigateToCasesCreateTemplate, getCasesCreateTemplateUrl, navigateToCasesFieldLibrary, getCasesFieldLibraryUrl, }: GetTemplatesListMenuArgs) => AppHeaderMenu;
interface GetTemplateFormMenuArgs {
    hasChanges: boolean;
    hasYamlValidationErrors: boolean;
    metadataErrors: TemplateMetadataErrors;
    isEdit: boolean;
    isLoading?: boolean;
    isSaving?: boolean;
    isEnabled: boolean;
    submitError: string | null;
    onReset: () => void;
    onSave: () => void;
    onIsEnabledChange: (isEnabled: boolean) => void;
}
export declare const getTemplateFormBadges: (hasChanges: boolean) => AppHeaderBadge[];
export declare const getTemplateFormMenu: ({ hasChanges, hasYamlValidationErrors, metadataErrors, isEdit, isLoading, isSaving, isEnabled, submitError, onReset, onSave, onIsEnabledChange, }: GetTemplateFormMenuArgs) => AppHeaderMenu;
export {};

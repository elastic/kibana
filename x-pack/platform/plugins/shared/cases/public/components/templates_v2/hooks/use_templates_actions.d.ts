import type { Template } from '../../../../common/types/domain/template/v1';
interface UseTemplatesActionsProps {
    onDeleteSuccess?: () => void;
}
export declare const useTemplatesActions: ({ onDeleteSuccess }?: UseTemplatesActionsProps) => {
    handleEdit: (template: Template) => void;
    handleClone: (template: Template) => void;
    handleExport: (template: Template) => void;
    handleDelete: (template: Template) => void;
    confirmDelete: () => void;
    cancelDelete: () => void;
    templateToDelete: {
        templateId: string;
        name: string;
        owner: string;
        definition: string;
        templateVersion: number;
        deletedAt: string | null;
        description?: string | undefined;
        tags?: string[] | undefined;
        author?: string | undefined;
        usageCount?: number | undefined;
        fieldCount?: number | undefined;
        fieldNames?: {
            name: string;
            label: string;
            type: string;
            control: string;
        }[] | undefined;
        lastUsedAt?: string | undefined;
        isDefault?: boolean | undefined;
        isLatest?: boolean | undefined;
        isEnabled?: boolean | undefined;
    } | null;
    isDeleting: boolean;
    isCloning: boolean;
    isExporting: boolean;
    isUpdating: boolean;
    handleIsEnabledChange: (template: Template) => void;
};
export {};

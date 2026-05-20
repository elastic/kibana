import type { CreateTemplateInput, Template } from '../../../../common/types/domain/template/v1';
import type { ServerError } from '../../../types';
interface MutationArgs {
    template: CreateTemplateInput;
}
interface UseCreateTemplateProps {
    onSuccess?: (data: Template) => void;
    disableDefaultSuccessToast?: boolean;
}
export declare const useCreateTemplate: ({ onSuccess, disableDefaultSuccessToast, }?: UseCreateTemplateProps) => import("@kbn/react-query").UseMutationResult<{
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
}, ServerError, MutationArgs, unknown>;
export {};

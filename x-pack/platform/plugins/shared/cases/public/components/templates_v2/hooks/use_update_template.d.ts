import type { Template } from '../../../../common/types/domain/template/v1';
import type { ServerError } from '../../../types';
import type { TemplateUpdateRequest } from '../types';
interface MutationArgs {
    templateId: string;
    template: TemplateUpdateRequest;
}
interface UseUpdateTemplateProps {
    onSuccess?: (data: Template) => void;
    disableDefaultSuccessToast?: boolean;
}
export declare const useUpdateTemplate: ({ onSuccess, disableDefaultSuccessToast, }?: UseUpdateTemplateProps) => import("@kbn/react-query").UseMutationResult<{
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

import type { ParsedTemplate } from '../../../common/types/domain/template/v1';
interface UseTemplateFormSyncReturn {
    template: ParsedTemplate | undefined;
    isLoading: boolean;
}
export declare const useTemplateFormSync: () => UseTemplateFormSyncReturn;
export {};

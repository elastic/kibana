import type { TemplatesFindRequest } from '../../../../common/types/api/template/v1';
interface UseSyncedQueryParamsReturn {
    queryParams: TemplatesFindRequest;
    setQueryParams: (params: Partial<TemplatesFindRequest>) => void;
}
export declare const useSyncedQueryParams: () => UseSyncedQueryParamsReturn;
export {};

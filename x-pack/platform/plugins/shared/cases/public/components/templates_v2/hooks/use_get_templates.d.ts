import type { UseQueryResult } from '@kbn/react-query';
import type { TemplatesFindRequest, TemplatesFindResponse } from '../../../../common/types/api/template/v1';
export declare const useGetTemplates: (params?: {
    queryParams?: Partial<TemplatesFindRequest>;
}) => UseQueryResult<TemplatesFindResponse>;

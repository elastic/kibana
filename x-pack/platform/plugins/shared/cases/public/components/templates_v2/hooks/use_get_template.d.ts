import type { UseQueryResult } from '@kbn/react-query';
import type { ParsedTemplate } from '../../../../common/types/domain/template/v1';
export declare const useGetTemplate: (templateId?: string, version?: number, { silent, includeDeleted }?: {
    silent?: boolean;
    includeDeleted?: boolean;
}) => UseQueryResult<ParsedTemplate>;

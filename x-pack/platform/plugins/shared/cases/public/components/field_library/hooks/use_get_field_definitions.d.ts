import type { UseQueryResult } from '@kbn/react-query';
import type { FieldDefinitionsFindResponse } from '../../../../common/types/api/field_definition/v1';
export declare const useGetFieldDefinitions: ({ owner, isGlobal, staleTime, }?: {
    owner?: string | string[];
    isGlobal?: boolean;
    /** Override React Query's default staleTime (ms). Pass `Infinity` for data that
     * should be fetched once and never re-fetched during the session. */
    staleTime?: number;
}) => UseQueryResult<FieldDefinitionsFindResponse>;

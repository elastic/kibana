import type { UseQueryResult } from '@kbn/react-query';
import type { FieldDefinitionsFindResponse } from '../../../../common/types/api/field_definition/v1';
export declare const useGetFieldDefinitions: ({ owner, }?: {
    owner?: string | string[];
}) => UseQueryResult<FieldDefinitionsFindResponse>;

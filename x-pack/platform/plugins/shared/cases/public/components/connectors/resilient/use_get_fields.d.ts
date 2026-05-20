import type { HttpSetup } from '@kbn/core/public';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import type { ServerError } from '../../../types';
import type { ActionConnector } from '../../../../common/types/domain';
import type { ResilientFieldMetadata } from './types';
interface Props {
    http: HttpSetup;
    connector?: ActionConnector;
}
export interface GetFieldsData {
    fields: EnhancedFieldMetaData[];
    fieldsObj: Record<string, EnhancedFieldMetaData>;
}
export interface EnhancedFieldMetaData extends ResilientFieldMetadata {
    label: string;
    value: string;
}
export declare const useGetFields: ({ http, connector }: Props) => import("@kbn/react-query").UseQueryResult<ActionTypeExecutorResult<GetFieldsData>, ServerError>;
export type UseGetIncidentTypes = ReturnType<typeof useGetFields>;
export {};

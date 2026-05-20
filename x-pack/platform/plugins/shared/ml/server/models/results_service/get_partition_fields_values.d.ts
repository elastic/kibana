import { type MlPartitionFieldsType, type CriteriaField } from '@kbn/ml-anomaly-utils';
import type { FieldsConfig } from '../../routes/schemas/results_service_schema';
import type { MlClient } from '../../lib/ml_client';
type SearchTerm = {
    [key in MlPartitionFieldsType]?: string;
} | undefined;
export interface PartitionFieldData {
    name: string;
    values: Array<{
        value: string;
        maxRecordScore?: number;
    }>;
}
export type PartitionFieldValueResponse = Record<MlPartitionFieldsType, PartitionFieldData>;
export declare const getPartitionFieldsValuesFactory: (mlClient: MlClient) => (jobId: string, searchTerm: SearchTerm, criteriaFields: CriteriaField[], earliestMs: number, latestMs: number, fieldsConfig?: FieldsConfig) => Promise<PartitionFieldValueResponse | {}>;
export {};

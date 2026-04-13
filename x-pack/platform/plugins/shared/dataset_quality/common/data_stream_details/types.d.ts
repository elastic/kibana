import type { Integration } from '../data_streams_stats/integration';
export interface AnalyzeDegradedFieldsParams {
    dataStream: string;
    lastBackingIndex: string;
    degradedField: string;
}
export interface UpdateFieldLimitParams {
    dataStream: string;
    newFieldLimit: number;
}
export interface CheckAndLoadIntegrationParams {
    dataStream: string;
}
export interface IntegrationType {
    isIntegration: boolean;
    areAssetsAvailable: boolean;
    integration?: Integration;
}
export interface UpdateFailureStoreParams {
    dataStream: string;
    failureStoreEnabled: boolean;
    customRetentionPeriod?: string;
}

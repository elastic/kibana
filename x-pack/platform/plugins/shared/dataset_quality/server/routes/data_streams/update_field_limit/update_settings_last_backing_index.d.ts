import type { DatasetQualityESClient } from '../../../utils/create_dataset_quality_es_client';
interface UpdateLastBackingIndexSettingsResponse {
    acknowledged: boolean | undefined;
    error?: string;
}
export declare function updateLastBackingIndexSettings({ datasetQualityESClient, lastBackingIndex, newFieldLimit, }: {
    datasetQualityESClient: DatasetQualityESClient;
    lastBackingIndex: string;
    newFieldLimit: number;
}): Promise<UpdateLastBackingIndexSettingsResponse>;
export {};

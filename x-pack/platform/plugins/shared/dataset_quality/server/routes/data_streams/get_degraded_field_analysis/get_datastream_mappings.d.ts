import type { DatasetQualityESClient } from '../../../utils/create_dataset_quality_es_client';
export interface DataStreamMappingResponse {
    fieldCount: number;
    fieldPresent: boolean;
    fieldMapping?: {
        type?: string;
        ignore_above?: number;
    };
}
export declare function getDataStreamMapping({ field, datasetQualityESClient, dataStream, lastBackingIndex, }: {
    field: string;
    datasetQualityESClient: DatasetQualityESClient;
    dataStream: string;
    lastBackingIndex: string;
}): Promise<DataStreamMappingResponse>;

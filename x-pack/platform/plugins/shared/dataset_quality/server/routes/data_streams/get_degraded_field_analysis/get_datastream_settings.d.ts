import type { DatasetQualityESClient } from '../../../utils/create_dataset_quality_es_client';
export interface DataStreamSettingResponse {
    nestedFieldLimit?: number;
    totalFieldLimit: number;
    ignoreDynamicBeyondLimit?: boolean;
    ignoreMalformed?: boolean;
    defaultPipeline?: string;
}
export declare function getDataStreamSettings({ datasetQualityESClient, dataStream, lastBackingIndex, }: {
    datasetQualityESClient: DatasetQualityESClient;
    dataStream: string;
    lastBackingIndex: string;
}): Promise<DataStreamSettingResponse>;

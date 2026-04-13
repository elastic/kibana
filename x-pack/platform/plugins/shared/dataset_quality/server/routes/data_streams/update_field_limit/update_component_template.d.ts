import type { DatasetQualityESClient } from '../../../utils/create_dataset_quality_es_client';
interface UpdateComponentTemplateResponse {
    acknowledged: boolean | undefined;
    componentTemplateName: string;
    error?: string;
}
export declare function updateComponentTemplate({ datasetQualityESClient, indexTemplate, newFieldLimit, }: {
    datasetQualityESClient: DatasetQualityESClient;
    indexTemplate: string;
    newFieldLimit: number;
}): Promise<UpdateComponentTemplateResponse>;
export {};

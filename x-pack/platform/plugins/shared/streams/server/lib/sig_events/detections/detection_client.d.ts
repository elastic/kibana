import type { IDataStreamClient } from '@kbn/data-streams';
import type { ElasticsearchClient } from '@kbn/core/server';
import { type CommonSearchOptions } from '../query_utils';
import { type Detection, type StoredDetection, type detectionsMappings } from './data_stream';
export type DetectionDataStreamClient = IDataStreamClient<typeof detectionsMappings, StoredDetection>;
export interface DetectionsSearchOptions extends CommonSearchOptions {
    rule_uuid?: string[];
    rule_name?: string;
}
export declare class DetectionClient {
    private readonly clients;
    constructor(clients: {
        dataStreamClient: DetectionDataStreamClient;
        esClient: ElasticsearchClient;
        space: string;
    });
    bulkCreate(detections: Detection[]): Promise<import("@elastic/elasticsearch/lib/api/types").BulkResponse>;
    findLatest(options?: DetectionsSearchOptions): Promise<{
        hits: Detection[];
    }>;
}

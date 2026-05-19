import type { ElasticsearchClient } from '@kbn/core/server';
export declare function getDataStreamsQueryMetadata({ dataStreamName, esClient, }: {
    dataStreamName: string;
    esClient: ElasticsearchClient;
}): Promise<{
    maxIngested: number | undefined;
    namespace: string;
    dataset: string;
    type: string;
    serviceNames: string[];
    environments: string[];
}>;

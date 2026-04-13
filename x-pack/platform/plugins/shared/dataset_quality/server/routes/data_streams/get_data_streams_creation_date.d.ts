import type { ElasticsearchClient } from '@kbn/core/server';
export declare function getDataStreamsCreationDate({ esClient, dataStreams, }: {
    esClient: ElasticsearchClient;
    dataStreams: string[];
}): Promise<Record<string, number | undefined>>;

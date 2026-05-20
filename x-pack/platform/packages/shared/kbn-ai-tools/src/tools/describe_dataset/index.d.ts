import type { ElasticsearchClient } from '@kbn/core/server';
export declare function describeDataset({ esClient, start, end, index, kql, }: {
    esClient: ElasticsearchClient;
    start: number;
    end: number;
    index: string | string[];
    kql?: string;
}): Promise<import("./document_analysis").DocumentAnalysis>;

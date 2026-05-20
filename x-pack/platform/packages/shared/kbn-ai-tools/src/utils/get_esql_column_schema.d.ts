import type { ElasticsearchClient } from '@kbn/core/server';
export interface EsqlColumnSchema {
    name: string;
    type: string;
    originalTypes?: string[];
}
export interface GetEsqlColumnSchemaParams {
    esClient: ElasticsearchClient;
    index: string | string[];
    start?: number;
    end?: number;
}
export declare function getEsqlColumnSchema({ esClient, index, start, end, }: GetEsqlColumnSchemaParams): Promise<EsqlColumnSchema[]>;

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
export interface GetDocumentByIdSuccess {
    id: string;
    index: string;
    found: true;
    _source: Record<string, unknown>;
}
export interface GetDocumentByIdFailure {
    id: string;
    index: string;
    found: false;
}
export type GetDocumentByIdResult = GetDocumentByIdSuccess | GetDocumentByIdFailure;
export declare const getDocumentById: ({ id, index, esClient, }: {
    id: string;
    index: string;
    esClient: ElasticsearchClient;
}) => Promise<GetDocumentByIdResult>;

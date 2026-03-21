import type { EsqlEsqlColumnInfo, FieldValue } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
export interface EsqlResponse {
    columns: EsqlEsqlColumnInfo[];
    values: FieldValue[][];
}
/**
 * Execute an ES|QL query and returns the response.
 * Cross-cluster search (CCS) is supported: queries may target remote indices (e.g. FROM remote:index).
 * allow_partial_results is enabled so that if a remote cluster is unavailable during a CCS query,
 * partial results from the available clusters are returned instead of failing the entire request.
 */
export declare const executeEsql: ({ query, params, esClient, }: {
    query: string;
    params?: Array<Record<string, FieldValue>>;
    esClient: ElasticsearchClient;
}) => Promise<EsqlResponse>;

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
 *
 * When `limit` is provided, the query is rewritten so the ES|QL engine enforces the cap. If the
 * query already ends with a `LIMIT N`, the trailing limit becomes `min(N, limit)`; otherwise a
 * new `| LIMIT <limit>` pipe is appended. See `applyLimit` for full semantics.
 */
export declare const executeEsql: ({ query, params, limit, esClient, }: {
    query: string;
    params?: Array<Record<string, FieldValue>>;
    limit?: number;
    esClient: ElasticsearchClient;
}) => Promise<EsqlResponse>;

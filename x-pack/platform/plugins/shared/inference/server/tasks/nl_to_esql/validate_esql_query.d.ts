import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLRow } from '@kbn/es-types';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
export interface QueryValidateRunOutput {
    columns?: DatatableColumn[];
    rows?: ESQLRow[];
    error?: Error;
    errorMessages?: string[];
}
export declare function runAndValidateEsqlQuery({ query, client, }: {
    query: string;
    client: ElasticsearchClient;
}): Promise<QueryValidateRunOutput>;

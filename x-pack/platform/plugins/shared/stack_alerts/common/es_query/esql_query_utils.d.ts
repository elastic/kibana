import type { ParseAggregationResultsOpts } from '@kbn/triggers-actions-ui-plugin/common';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { EsqlEsqlShardFailure } from '@elastic/elasticsearch/lib/api/types';
type EsqlDocument = Record<string, string | null>;
interface EsqlResultColumn {
    name: string;
    type: string;
}
interface EsqlQueryHits {
    results: ParseAggregationResultsOpts;
    rows: EsqlDocument[];
    cols: Array<{
        id: string;
        actions: boolean;
    }>;
    duplicateAlertIds?: Set<string>;
    longAlertIds?: Set<string>;
}
type EsqlResultRow = Array<string | null>;
export interface EsqlTable {
    columns: EsqlResultColumn[];
    values: EsqlResultRow[];
    is_partial?: boolean;
    _clusters?: {
        details?: {
            [key: string]: {
                failures?: EsqlEsqlShardFailure[];
            };
        };
    };
}
export declare const ALERT_ID_COLUMN = "Alert ID";
export declare const ALERT_ID_SUGGESTED_MAX = 10;
export declare const rowToDocument: (columns: EsqlResultColumn[], row: EsqlResultRow) => EsqlDocument;
export declare const getEsqlQueryHits: (table: EsqlTable, query: string, isGroupAgg: boolean, isPreview?: boolean) => Promise<EsqlQueryHits>;
export declare const toEsqlQueryHits: (table: EsqlTable, isPreview?: boolean, chunkSize?: number) => Promise<EsqlQueryHits>;
export declare const toGroupedEsqlQueryHits: (table: EsqlTable, alertIdFields: string[], isPreview?: boolean, chunkSize?: number) => Promise<EsqlQueryHits>;
export declare const transformToEsqlTable: (datatable: ESQLSearchResponse) => EsqlTable;
export declare const getAlertIdFields: (query: string, resultColumns: EsqlResultColumn[]) => string[];
export {};

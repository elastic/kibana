import type { IUiSettingsClient } from '@kbn/core/public';
import type { DateRange, FormBasedLayer, IndexPattern, GenericIndexPatternColumn } from '@kbn/lens-common';
import type { OriginalColumn } from '../../../common/types';
import type { EsqlConversionFailureReason } from './to_esql_failure_reasons';
export declare const extractAggId: (id: string) => string;
/**
 * Result type for generateEsqlQuery.
 * Either a successful conversion with the ES|QL query,
 * or a failure with a specific reason.
 */
interface EsqlQuerySuccess {
    success: true;
    esql: string;
    partialRows: boolean;
    esAggsIdMap: Record<string, OriginalColumn[]>;
}
interface EsqlQueryFailure {
    success: false;
    reason: EsqlConversionFailureReason;
    operationType?: string;
}
export type EsqlQueryResult = EsqlQuerySuccess | EsqlQueryFailure;
/**
 * Type guard to check if the result is a successful ES|QL query.
 */
export declare const isEsqlQuerySuccess: (result: unknown) => result is EsqlQuerySuccess;
/**
 * Type guard to check if the result is a failed ES|QL query.
 */
export declare const isEsqlQueryFailure: (result: unknown) => result is EsqlQueryFailure;
/**
 * Optional mapping of column IDs to semantic role names.
 * Used to generate more meaningful ES|QL column names.
 * e.g., { 'col-123': 'max_value' } will generate
 * `EVAL static_max_value = 100` instead of `EVAL static_value = 100`.
 */
export interface ColumnRoles {
    [columnId: string]: string;
}
export declare function generateEsqlQuery(esAggEntries: Array<readonly [string, GenericIndexPatternColumn]>, layer: FormBasedLayer, indexPattern: IndexPattern, uiSettings: IUiSettingsClient, dateRange: DateRange, nowInstant: Date, columnRoles?: ColumnRoles): EsqlQueryResult;
export {};

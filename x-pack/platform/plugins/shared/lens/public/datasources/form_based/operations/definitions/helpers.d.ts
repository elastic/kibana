import type { Query } from '@kbn/es-query';
import type { ColumnBuildHints, FormattedIndexPatternColumn, GenericIndexPatternColumn, TextBasedLayerColumn, FormBasedLayer, FormBasedPersistedState, IndexPattern, IndexPatternField } from '@kbn/lens-common';
import { type FieldBasedOperationErrorMessage } from '.';
export declare function getInvalidFieldMessage(layer: FormBasedLayer, columnId: string, indexPattern?: IndexPattern): FieldBasedOperationErrorMessage[];
export declare const generateMissingFieldMessage: (missingFields: string[], columnId: string) => FieldBasedOperationErrorMessage;
export declare function getSafeName(name: string, indexPattern: IndexPattern | undefined): string;
export declare function isValidNumber(inputValue: string | number | null | undefined, integer?: boolean, upperBound?: number, lowerBound?: number, digits?: number): boolean;
/**
 * Type guard for narrowing a full column to a specific column type.
 * Use this when you have a complete `GenericIndexPatternColumn` and need to
 * access type-specific properties with full type safety.
 */
export declare function isColumnOfType<C extends GenericIndexPatternColumn>(type: C['operationType'], column: GenericIndexPatternColumn): column is C;
/**
 * Checks if partial column hints match a specific operation type.
 * Use this in `buildColumn` implementations when working with `previousColumn`
 * which is typed as `ColumnBuildHints` (partial metadata, not a full column).
 *
 * Unlike `isColumnOfType`, this does NOT narrow the type - it only returns a boolean.
 * Use `getBooleanParam` or `getNumberParam` to safely extract typed params.
 */
export declare function hasOperationType(column: ColumnBuildHints | undefined, type: string): boolean;
/**
 * Safely extracts a boolean param from column hints.
 * Returns `undefined` if the param doesn't exist or isn't a boolean.
 */
export declare function getBooleanParam(column: ColumnBuildHints | undefined, paramName: string): boolean | undefined;
/**
 * Safely extracts a number param from column hints.
 * Returns `undefined` if the param doesn't exist or isn't a number.
 */
export declare function getNumberParam(column: ColumnBuildHints | undefined, paramName: string): number | undefined;
export declare const isColumn: (setter: GenericIndexPatternColumn | FormBasedLayer | ((prevLayer: FormBasedLayer) => FormBasedLayer)) => setter is GenericIndexPatternColumn;
export declare function isColumnFormatted(column: GenericIndexPatternColumn | TextBasedLayerColumn): column is FormattedIndexPatternColumn | TextBasedLayerColumn;
export declare function getFormatFromPreviousColumn(previousColumn: ColumnBuildHints | undefined): {
    format: import("@kbn/lens-common").ValueFormatConfig;
} | undefined;
export declare function getExistsFilter(field: string, escape?: boolean): {
    query: string;
    language: string;
};
export declare function comparePreviousColumnFilter(filter: Query | undefined, field: string): boolean;
export declare function getFilter(previousColumn: ColumnBuildHints | undefined, columnParams: {
    kql?: string | undefined;
    lucene?: string | undefined;
} | undefined): Query | undefined;
export declare function isMetricCounterField(field?: IndexPatternField): boolean;
export declare function cleanupFormulaColumns(state: FormBasedPersistedState): FormBasedPersistedState;

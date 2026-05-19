import type { Query } from '@kbn/es-query';
import type { FormattedIndexPatternColumn, GenericIndexPatternColumn, ReferenceBasedIndexPatternColumn, TextBasedLayerColumn, FormBasedLayer, FormBasedPersistedState, IndexPattern, IndexPatternField } from '@kbn/lens-common';
import { type FieldBasedOperationErrorMessage } from '.';
export declare function getInvalidFieldMessage(layer: FormBasedLayer, columnId: string, indexPattern?: IndexPattern): FieldBasedOperationErrorMessage[];
export declare const generateMissingFieldMessage: (missingFields: string[], columnId: string) => FieldBasedOperationErrorMessage;
export declare function getSafeName(name: string, indexPattern: IndexPattern | undefined): string;
export declare function isValidNumber(inputValue: string | number | null | undefined, integer?: boolean, upperBound?: number, lowerBound?: number, digits?: number): boolean;
export declare function isColumnOfType<C extends GenericIndexPatternColumn>(type: C['operationType'], column: GenericIndexPatternColumn): column is C;
export declare const isColumn: (setter: GenericIndexPatternColumn | FormBasedLayer | ((prevLayer: FormBasedLayer) => FormBasedLayer)) => setter is GenericIndexPatternColumn;
export declare function isColumnFormatted(column: GenericIndexPatternColumn | TextBasedLayerColumn): column is FormattedIndexPatternColumn | TextBasedLayerColumn;
export declare function getFormatFromPreviousColumn(previousColumn: GenericIndexPatternColumn | ReferenceBasedIndexPatternColumn | undefined): {
    format: import("@kbn/lens-common").ValueFormatConfig | undefined;
} | undefined;
export declare function getExistsFilter(field: string, escape?: boolean): {
    query: string;
    language: string;
};
export declare function comparePreviousColumnFilter(filter: Query | undefined, field: string): boolean;
export declare function getFilter(previousColumn: GenericIndexPatternColumn | undefined, columnParams: {
    kql?: string | undefined;
    lucene?: string | undefined;
} | undefined): Query | undefined;
export declare function isMetricCounterField(field?: IndexPatternField): boolean;
export declare function cleanupFormulaColumns(state: FormBasedPersistedState): FormBasedPersistedState;

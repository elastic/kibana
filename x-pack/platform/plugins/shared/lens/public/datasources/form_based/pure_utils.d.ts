import type { DataType, BaseIndexPatternColumn, FieldBasedIndexPatternColumn, FormBasedLayer, GenericIndexPatternColumn, IndexPattern, IndexPatternField, VisualizationDimensionGroupConfig } from '@kbn/lens-common';
/**
 * Normalizes the specified operation type. (e.g. document operations
 * produce 'number')
 */
export declare function normalizeOperationDataType(type: DataType): "string" | "number" | "boolean" | "geo_shape" | "gauge" | "counter" | "ip" | "date" | "geo_point" | "murmur3";
export declare function hasField(column: BaseIndexPatternColumn): column is FieldBasedIndexPatternColumn;
export declare function shouldShowTimeSeriesOption(layer: FormBasedLayer, indexPattern: IndexPattern, groupId: string, dimensionGroups: VisualizationDimensionGroupConfig[]): boolean;
export declare function getFieldType(field: IndexPatternField): string;
export declare function getReferencedField(column: GenericIndexPatternColumn | undefined, indexPattern: IndexPattern, layer: FormBasedLayer): IndexPatternField | undefined;
export declare function sortByField<C extends BaseIndexPatternColumn>(columns: C[]): C[];
/**
 * Returns the single value from a Set if it has exactly one element, otherwise undefined.
 * Useful when auto-selecting the only available option.
 */
export declare function getSingleValue<T>(set: Set<T> | undefined): T | undefined;
/**
 * Returns the first value from a non-empty Set, or undefined if the Set is empty/undefined.
 * Useful as a fallback when any available option will do.
 */
export declare function getFirstValue<T>(set: Set<T> | undefined): T | undefined;

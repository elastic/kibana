import type { DataType, BaseIndexPatternColumn, FieldBasedIndexPatternColumn, FormBasedLayer, GenericIndexPatternColumn, IndexPattern, IndexPatternField, VisualizationDimensionGroupConfig } from '@kbn/lens-common';
/**
 * Normalizes the specified operation type. (e.g. document operations
 * produce 'number')
 */
export declare function normalizeOperationDataType(type: DataType): "string" | "number" | "boolean" | "ip" | "date" | "counter" | "gauge" | "geo_shape" | "geo_point" | "murmur3";
export declare function hasField(column: BaseIndexPatternColumn): column is FieldBasedIndexPatternColumn;
export declare function shouldShowTimeSeriesOption(layer: FormBasedLayer, indexPattern: IndexPattern, groupId: string, dimensionGroups: VisualizationDimensionGroupConfig[]): boolean;
export declare function getFieldType(field: IndexPatternField): string;
export declare function getReferencedField(column: GenericIndexPatternColumn | undefined, indexPattern: IndexPattern, layer: FormBasedLayer): IndexPatternField | undefined;
export declare function sortByField<C extends BaseIndexPatternColumn>(columns: C[]): C[];

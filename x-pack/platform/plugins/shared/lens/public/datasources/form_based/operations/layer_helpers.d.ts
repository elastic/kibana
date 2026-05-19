import type { CoreStart } from '@kbn/core/public';
import type { Query } from '@kbn/es-query';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { TimeScaleUnit, DateRange, FormBasedLayer, GenericIndexPatternColumn, FormBasedPrivateState } from '@kbn/lens-common';
import type { IndexPattern, IndexPatternField, VisualizationDimensionGroupConfig, BaseIndexPatternColumn, DatasourceFixAction } from '@kbn/lens-common';
import { type OperationType, type RequiredReference, type GenericOperationDefinition, type FieldBasedOperationErrorMessage } from './definitions';
import type { DataViewDragDropOperation } from '../types';
import type { DataType, OperationMetadata } from '../../..';
export interface ColumnAdvancedParams {
    filter?: Query | undefined;
    timeShift?: string | undefined;
    timeScale?: TimeScaleUnit | undefined;
    dataType?: DataType;
}
interface ColumnChange {
    op: OperationType;
    layer: FormBasedLayer;
    columnId: string;
    indexPattern: IndexPattern;
    field?: IndexPatternField;
    visualizationGroups: VisualizationDimensionGroupConfig[];
    targetGroup?: string;
    shouldResetLabel?: boolean;
    shouldCombineField?: boolean;
    incompleteParams?: ColumnAdvancedParams;
    incompleteFieldName?: string;
    incompleteFieldOperation?: OperationType;
    columnParams?: Record<string, unknown>;
    initialParams?: {
        params: Record<string, unknown>;
    };
    references?: Array<Omit<ColumnChange, 'layer'>>;
    respectOrder?: boolean;
}
interface ColumnCopy {
    layers: Record<string, FormBasedLayer>;
    target: DataViewDragDropOperation;
    source: DataViewDragDropOperation;
    shouldDeleteSource?: boolean;
}
export declare function copyColumn({ layers, source, target }: ColumnCopy): Record<string, FormBasedLayer>;
export declare function insertOrReplaceColumn(args: ColumnChange): FormBasedLayer;
export declare function insertNewColumn({ op, layer, columnId, field, indexPattern, visualizationGroups, targetGroup, incompleteParams, incompleteFieldName, incompleteFieldOperation, columnParams, initialParams, references, respectOrder, }: ColumnChange): FormBasedLayer;
export declare function replaceColumn({ layer, columnId, indexPattern, op, field, visualizationGroups, initialParams, shouldResetLabel, shouldCombineField, }: ColumnChange): FormBasedLayer;
export declare function canTransition({ layer, columnId, op, field, indexPattern, filterOperations, visualizationGroups, dateRange, }: ColumnChange & {
    filterOperations: (meta: OperationMetadata) => boolean;
    dateRange: DateRange;
}): boolean;
export declare function reorderByGroups(visualizationGroups: VisualizationDimensionGroupConfig[], updatedColumnOrder: string[], targetGroup: string | undefined, addedColumnId: string): string[];
export declare function getMetricOperationTypes(field: IndexPatternField): GenericOperationDefinition<BaseIndexPatternColumn>[];
export declare function updateColumnLabel({ layer, columnId, customLabel, }: {
    layer: FormBasedLayer;
    columnId: string;
    customLabel?: string;
}): FormBasedLayer;
export declare function updateColumnParam({ layer, columnId, paramName, value, }: {
    layer: FormBasedLayer;
    columnId: string;
    paramName: string;
    value: unknown;
}): FormBasedLayer;
export declare function adjustColumnReferences(layer: FormBasedLayer): {
    columns: {
        [x: string]: GenericIndexPatternColumn;
    };
    columnOrder: string[];
    indexPatternId: string;
    linkToLayers?: string[];
    incompleteColumns?: Record<string, import("@kbn/lens-common").IncompleteColumn | undefined>;
    sampling?: number;
    ignoreGlobalFilters?: boolean;
};
export declare function adjustColumnReferencesForChangedColumn(layer: FormBasedLayer, changedColumnId: string): {
    columns: {
        [x: string]: GenericIndexPatternColumn;
    };
    columnOrder: string[];
    indexPatternId: string;
    linkToLayers?: string[];
    incompleteColumns?: Record<string, import("@kbn/lens-common").IncompleteColumn | undefined>;
    sampling?: number;
    ignoreGlobalFilters?: boolean;
};
export declare function deleteColumn({ layer, columnId, indexPattern, }: {
    layer: FormBasedLayer;
    columnId: string;
    indexPattern: IndexPattern;
}): FormBasedLayer;
export declare function getColumnOrder(layer: FormBasedLayer): string[];
export declare function getExistingColumnGroups(layer: FormBasedLayer): [string[], string[], string[]];
/**
 * Returns true if the given column can be applied to the given index pattern
 */
export declare function isColumnTransferable(column: GenericIndexPatternColumn, newIndexPattern: IndexPattern, layer: FormBasedLayer): boolean;
export declare function updateLayerIndexPattern(layer: FormBasedLayer, newIndexPattern: IndexPattern): FormBasedLayer;
type LayerErrorMessage = FieldBasedOperationErrorMessage & {
    fixAction: DatasourceFixAction<FormBasedPrivateState>;
};
/**
 * Collects all errors from the columns in the layer, for display in the workspace. This includes:
 *
 * - All columns have complete references
 * - All column references are valid
 * - All prerequisites are met
 * - If timeshift is used, terms go before date histogram
 * - If timeshift is used, only a single date histogram can be used
 */
export declare function getErrorMessages(layer: FormBasedLayer, indexPattern: IndexPattern, state: FormBasedPrivateState, layerId: string, core: CoreStart, data: DataPublicPluginStart): LayerErrorMessage[] | undefined;
export declare function isReferenced(layer: FormBasedLayer, columnId: string): boolean;
/**
 * Given a columnId, returns the visible root column id for it
 * This is useful to map internal properties of referenced columns to the visible column
 * @param layer
 * @param columnId
 * @returns id of the reference root
 */
export declare function getReferenceRoot(layer: FormBasedLayer, columnId: string): string;
export declare function hasTermsWithManyBuckets(layer: FormBasedLayer): boolean;
export declare function isOperationAllowedAsReference({ operationType, validation, field, indexPattern, }: {
    operationType: OperationType;
    validation: RequiredReference;
    indexPattern: IndexPattern;
    field?: IndexPatternField;
}): boolean;
export declare function updateDefaultLabels(layer: FormBasedLayer, indexPattern: IndexPattern): FormBasedLayer;
export declare function resetIncomplete(layer: FormBasedLayer, columnId: string): FormBasedLayer;
export declare function isColumnValidAsReference({ column, validation, }: {
    column: GenericIndexPatternColumn;
    validation: RequiredReference;
}): boolean;
export declare function getManagedColumnsFrom(columnId: string, columns: Record<string, GenericIndexPatternColumn>): Array<[string, GenericIndexPatternColumn]>;
export {};

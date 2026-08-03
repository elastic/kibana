import type { BaseIndexPatternColumn, OperationMetadata, IndexPattern, IndexPatternField } from '@kbn/lens-common';
import type { GenericOperationDefinition, OperationType } from './definitions';
export { operationDefinitionMap } from './definitions';
/**
 * Map aggregation names from Elasticsearch to Lens names.
 * Used when loading indexpatterns to map metadata (i.e. restrictions)
 */
export declare function translateToOperationName(agg: string): OperationType;
/**
 * Returns all available operation types as a list at runtime.
 * This will be an array of each member of the union type `OperationType`
 * without any guaranteed order
 */
export declare function getOperations(): OperationType[];
/**
 * Returns a list of the display names of all operations with any guaranteed order.
 */
export declare const getOperationDisplay: (() => Record<string, {
    type: OperationType;
    displayName: string;
}>) & import("lodash").MemoizedFunction;
export declare function getSortScoreByPriority(a: GenericOperationDefinition, b: GenericOperationDefinition): number;
export declare const getSortScoreByPriorityForField: (field?: IndexPatternField) => (a: GenericOperationDefinition, b: GenericOperationDefinition) => number;
export declare function getCurrentFieldsForOperation(targetColumn: BaseIndexPatternColumn): string[];
export declare function getOperationHelperForMultipleFields(operationType: string): ((props: {
    targetColumn: BaseIndexPatternColumn;
    sourceColumn?: import("@kbn/lens-common").GenericIndexPatternColumn;
    field?: IndexPatternField;
    indexPattern: IndexPattern;
}) => Partial<{}>) | undefined;
export declare function hasOperationSupportForMultipleFields(indexPattern: IndexPattern, targetColumn: BaseIndexPatternColumn, sourceColumn?: BaseIndexPatternColumn, field?: IndexPatternField): boolean;
/**
 * Returns all `OperationType`s that can build a column using `buildColumn` based on the
 * passed in field.
 */
export declare function getOperationTypesForField(field: IndexPatternField, filterOperations?: (operation: OperationMetadata) => boolean, alreadyUsedOperations?: Set<string>): OperationType[];
export declare function isDocumentOperation(type: string): boolean;
export type OperationFieldTuple = {
    type: 'field';
    operationType: OperationType;
    field: string;
} | {
    type: 'none';
    operationType: OperationType;
} | {
    type: 'fullReference';
    operationType: OperationType;
} | {
    type: 'managedReference';
    operationType: OperationType;
    usedInMath?: boolean;
};
/**
 * Returns all possible operations (matches between operations and fields of the index
 * pattern plus matches for operations and documents of the index pattern) indexed by the
 * meta data of the operation.
 *
 * The resulting list is filtered down by the `filterOperations` function passed in by
 * the current visualization to determine which operations and field are applicable for
 * a given dimension.
 *
 * Example output:
 * ```
 * [
 *    {
 *      operationMetaData: { dataType: 'string', isBucketed: true },
 *      operations: [{
 *        type: 'field',
 *        operationType: ['terms'],
 *        field: 'keyword'
 *      }]
 *    },
 *    {
 *      operationMetaData: { dataType: 'string', isBucketed: true },
 *      operations: [{
 *        type: 'none',
 *        operationType: ['filters'],
 *      }]
 *    },
 * ]
 * ```
 */
export declare function getAvailableOperationsByMetadata(indexPattern: IndexPattern, customOperationDefinitionMap?: Record<string, GenericOperationDefinition>): {
    operationMetaData: OperationMetadata;
    operations: OperationFieldTuple[];
    usedInMath?: boolean;
}[];
export declare const memoizedGetAvailableOperationsByMetadata: typeof getAvailableOperationsByMetadata & import("lodash").MemoizedFunction;

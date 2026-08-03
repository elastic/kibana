import type { ColumnBuildHints, FieldBasedIndexPatternColumn, FormBasedLayer } from '@kbn/lens-common';
import type { GenericOperationDefinition } from '..';
export declare function getSafeFieldName({ sourceField: fieldName, operationType, }: FieldBasedIndexPatternColumn): string;
/**
 * Generates a formula string from a previous column's configuration.
 * Used when transitioning from another operation type to a formula operation.
 */
export declare function generateFormula(previousColumn: ColumnBuildHints, layer: FormBasedLayer, previousFormula: string, operationDefinitionMap: Record<string, GenericOperationDefinition> | undefined): string;

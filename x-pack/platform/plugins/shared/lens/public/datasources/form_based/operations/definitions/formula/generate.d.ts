import type { FieldBasedIndexPatternColumn, GenericIndexPatternColumn, ReferenceBasedIndexPatternColumn, FormBasedLayer } from '@kbn/lens-common';
import type { GenericOperationDefinition } from '..';
export declare function getSafeFieldName({ sourceField: fieldName, operationType, }: FieldBasedIndexPatternColumn): string;
export declare function generateFormula(previousColumn: ReferenceBasedIndexPatternColumn | GenericIndexPatternColumn, layer: FormBasedLayer, previousFormula: string, operationDefinitionMap: Record<string, GenericOperationDefinition> | undefined): string;

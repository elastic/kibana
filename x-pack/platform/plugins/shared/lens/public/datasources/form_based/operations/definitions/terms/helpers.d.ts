import type { FormBasedLayer, GenericIndexPatternColumn, IndexPattern, IndexPatternField, TermsIndexPatternColumn } from '@kbn/lens-common';
import type { FieldBasedOperationErrorMessage } from '..';
export declare function getMultiTermsScriptedFieldErrorMessage(layer: FormBasedLayer, columnId: string, indexPattern: IndexPattern): FieldBasedOperationErrorMessage[];
export declare function getDisallowedTermsMessage(layer: FormBasedLayer, columnId: string, indexPattern: IndexPattern): FieldBasedOperationErrorMessage[];
export declare function isPercentileSortable(column: GenericIndexPatternColumn): boolean;
export declare function isPercentileRankSortable(column: GenericIndexPatternColumn): boolean;
export declare function isSortableByColumn(layer: FormBasedLayer, columnId: string): boolean;
export declare function isScriptedField(field: IndexPatternField): boolean;
export declare function isScriptedField(fieldName: string, indexPattern: IndexPattern): boolean;
export declare function isRuntimeField(field: IndexPatternField): boolean;
export declare function getFieldsByValidationState(newIndexPattern: IndexPattern, column?: GenericIndexPatternColumn, field?: string | IndexPatternField): {
    allFields: Array<IndexPatternField | undefined>;
    validFields: string[];
    invalidFields: string[];
};
export declare function getOtherBucketSwitchDefault(column: TermsIndexPatternColumn, size: number): boolean;

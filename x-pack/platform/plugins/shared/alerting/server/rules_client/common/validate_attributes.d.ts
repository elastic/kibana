import type { KueryNode } from '@kbn/es-query';
export declare const getFieldNameAttribute: (fieldName: string, attributesToIgnore: string[]) => string;
export declare const validateOperationOnAttributes: (astFilter: KueryNode | null, sortField: string | undefined, searchFields: string[] | undefined, excludedFieldNames: string[]) => void;
export declare const validateSortField: (sortField: string, excludedFieldNames: string[]) => void;
export declare const validateSearchFields: (searchFields: string[], excludedFieldNames: string[]) => void;
export interface IterateActionProps {
    ast: KueryNode;
    index: number;
    fieldName: string;
    localFieldName: string;
}
export interface IterateFilterKureyNodeParams {
    astFilter: KueryNode;
    hasNestedKey?: boolean;
    nestedKeys?: string;
    storeValue?: boolean;
    path?: string;
    action?: (props: IterateActionProps) => void;
}
export interface ValidateFilterKueryNodeParams extends IterateFilterKureyNodeParams {
    excludedFieldNames: string[];
}
export declare const iterateFilterKureyNode: ({ astFilter, hasNestedKey, nestedKeys, storeValue, path, action, }: IterateFilterKureyNodeParams) => void;
export declare const validateFilterKueryNode: ({ astFilter, excludedFieldNames, hasNestedKey, nestedKeys, storeValue, path, }: ValidateFilterKueryNodeParams) => void;

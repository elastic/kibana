import type { IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
type KueryNode = any;
interface ValidateFilterKueryNode {
    astPath: string;
    error: string;
    isSavedObjectAttr: boolean;
    key: string;
    type: string | null;
}
interface ValidateFilterKueryNodeParams {
    astFilter: KueryNode;
    types: string[];
    indexMapping: IndexMapping;
    hasNestedKey?: boolean;
    nestedKeys?: string;
    storeValue?: boolean;
    path?: string;
    skipNormalization?: boolean;
}
export declare const validateFilterKueryNode: ({ astFilter, types, indexMapping, hasNestedKey, nestedKeys, storeValue, path, skipNormalization, }: ValidateFilterKueryNodeParams) => ValidateFilterKueryNode[];
/**
 * Is this filter key referring to a a top-level SavedObject attribute such as
 * `updated_at` or `references`.
 *
 * @param key
 * @param indexMapping
 */
export declare const isSavedObjectAttr: (key: string | null | undefined, indexMapping: IndexMapping) => boolean;
export declare const hasFilterKeyError: (key: string | null | undefined, types: string[], indexMapping: IndexMapping, skipNormalization?: boolean) => string | null;
export declare const fieldDefined: (indexMappings: IndexMapping, key: string) => boolean;
export declare const validateKuery: (kuery: string | undefined, allowedTypes: string[], indexMapping: IndexMapping, skipNormalization?: boolean) => {
    isValid: boolean;
    error: string | undefined;
} | undefined;
export {};

import { type CasesClient } from './client';
/**
 * Throws an error if the request has custom fields with duplicated keys.
 */
export declare const validateDuplicatedKeysInRequest: ({ requestFields, fieldName, }: {
    requestFields?: Array<{
        key: string;
    }>;
    fieldName: string;
}) => void;
/**
 * Throws an error if the request has observable types with duplicated labels.
 */
export declare const validateDuplicatedObservableTypesInRequest: ({ requestFields, }: {
    requestFields?: Array<{
        label: string;
        key: string;
    }>;
}) => void;
/**
 * Throws an error if the request has observable types with duplicated labels.
 */
export declare const validateDuplicatedObservablesInRequest: ({ requestFields, }: {
    requestFields?: Array<{
        typeKey: string;
        value: string;
    }>;
}) => void;
/**
 * Throws an error if observable type key is not valid
 */
export declare const validateObservableTypeKeyExists: (casesClient: CasesClient, { caseOwner, observableTypeKey, }: {
    caseOwner: string;
    observableTypeKey: string;
}) => Promise<void>;
export declare const validateObservableValue: (observableTypeKey: string | undefined, observableValue: unknown) => void;

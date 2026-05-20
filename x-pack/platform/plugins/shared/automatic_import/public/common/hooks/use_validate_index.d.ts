export interface UseValidateIndexResult {
    isValidating: boolean;
    validationError: string | null;
    validateIndex: (indexName: string) => Promise<boolean>;
    clearValidationError: () => void;
}
/**
 * Hook to validate that a selected index contains the required event.original field
 */
export declare function useValidateIndex(): UseValidateIndexResult;

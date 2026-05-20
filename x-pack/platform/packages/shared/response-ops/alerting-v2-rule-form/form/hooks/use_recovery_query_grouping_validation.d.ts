import type { Control } from 'react-hook-form';
import type { ISearchGeneric } from '@kbn/search-types';
import type { FormValues } from '../types';
interface UseRecoveryQueryValidationProps {
    /** Form control to watch grouping.fields */
    control: Control<FormValues>;
    /** Search service for fetching query columns */
    search: ISearchGeneric;
    /** The recovery ES|QL query to validate */
    query: string;
}
/**
 * Validates that a recovery query includes all the fields specified in the
 * rule's group key (`grouping.fields`).
 *
 * When a rule uses grouping, recovery queries must include those same fields
 * so the system can correctly match recovered results to the correct alert
 * instances. This hook wraps `useQueryGroupingValidation` with
 * recovery-specific error messages.
 */
export declare const useRecoveryQueryGroupingValidation: ({ control, search, query, }: UseRecoveryQueryValidationProps) => {
    /** Alias for queryColumns with a recovery-specific name */
    recoveryColumns: {
        name: string;
        type: string;
    }[];
    missingColumns: string[];
    isValidating: boolean;
    queryColumns: {
        name: string;
        type: string;
    }[];
    queryError: unknown;
    validationError: string | undefined;
};
export {};

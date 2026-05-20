import { type Control } from 'react-hook-form';
import type { ISearchGeneric } from '@kbn/search-types';
import type { FormValues } from '../types';
interface UseQueryGroupingValidationProps {
    /** Form control to watch grouping.fields */
    control: Control<FormValues>;
    /** Search service for fetching query columns */
    search: ISearchGeneric;
    /** The ES|QL query to validate */
    query: string;
    /** Callback to build a domain-specific error message from missing column names */
    getErrorMessage: (missingColumns: string[]) => string;
}
/**
 * Generic hook that validates whether a given ES|QL query includes all the
 * fields specified in `grouping.fields`.
 *
 * This is important because queries used for recovery (and potentially no-data)
 * must include all grouping fields so the system can correctly identify which
 * alert instances are affected.
 *
 * The hook:
 * 1. Watches `grouping.fields` from the form context
 * 2. Fetches column metadata from the provided query via `useQueryColumns`
 * 3. Compares columns against grouping fields to find any that are missing
 * 4. Returns the missing columns and a formatted validation error message
 */
export declare const useQueryGroupingValidation: ({ control, search, query, getErrorMessage, }: UseQueryGroupingValidationProps) => {
    /** Grouping field names not found in the query's output columns */
    missingColumns: string[];
    /** Whether the query columns are currently being fetched */
    isValidating: boolean;
    /** All columns returned by the query */
    queryColumns: {
        name: string;
        type: string;
    }[];
    /** Error from the query column fetch (e.g. syntax error) */
    queryError: unknown;
    /** Formatted validation error message, or undefined if valid */
    validationError: string | undefined;
};
export {};

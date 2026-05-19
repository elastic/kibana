import type { FormValues } from '../types';
interface UseFormDefaultsProps {
    /** The ES|QL query to derive defaults from */
    query: string;
}
/**
 * Computes the default form values based on the provided ES|QL query.
 *
 * This hook extracts:
 * - groupingKey: columns from the STATS ... BY clause
 *
 * The full query is used as-is for `evaluation.query.base` — it is no longer
 * split into base + condition because the framework executor only uses the
 * base query field.
 *
 * Note: timeField defaults to '@timestamp' which is the most common time field.
 * TimeFieldSelect may update this if @timestamp is not available in the query results.
 */
export declare const useFormDefaults: ({ query }: UseFormDefaultsProps) => FormValues;
export {};

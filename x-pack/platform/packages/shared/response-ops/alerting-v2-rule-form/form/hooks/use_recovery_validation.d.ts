import type { ISearchGeneric } from '@kbn/search-types';
interface UseRecoveryValidationProps {
    /** Search service for fetching query columns */
    search: ISearchGeneric;
}
/**
 * Consolidated recovery validation hook.
 *
 * Encapsulates ALL recovery validation logic in one place:
 * - ES|QL syntax validation for recovery queries
 * - Grouping field validation (all group-by fields present in recovery query)
 * - "Must differ from evaluation" validation
 *
 * The condition field is intentionally ignored — both evaluation and recovery
 * queries are validated using only their base query values.
 */
export declare const useRecoveryValidation: ({ search }: UseRecoveryValidationProps) => {
    evaluationBaseQuery: string;
    recoveryBaseQuery: string | null | undefined;
    recoveryMatchesEvaluation: boolean;
    groupingValidationError: string | undefined;
    fullBaseQueryRules: {
        required: string;
        validate: (value: string | null | undefined) => string | true;
    };
};
export {};

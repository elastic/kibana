import React from 'react';
interface RecoveryBaseQueryFieldProps {
    /** Override the default tooltip text. */
    labelTooltip?: string;
    /** Custom data-test-subj. Default: 'recoveryQueryField'. */
    dataTestSubj?: string;
    /** Validation rules provided by the parent (from useRecoveryValidation hook). */
    rules?: {
        required?: string;
        validate?: (value: string | null | undefined) => string | boolean | Promise<string | boolean>;
    };
    /** Errors to display in the editor (e.g., grouping validation errors). */
    errors?: Error[];
}
/**
 * Presentational ES|QL editor field for the recovery policy query.
 *
 * This is a thin wrapper around `EsqlEditorField` with recovery-specific labels.
 * All validation logic (syntax, grouping, differs-from-evaluation) is provided
 * externally via the `rules` and `errors` props from the `useRecoveryValidation` hook.
 */
export declare const RecoveryBaseQueryField: ({ labelTooltip, dataTestSubj, rules, errors, }: RecoveryBaseQueryFieldProps) => React.JSX.Element;
export {};

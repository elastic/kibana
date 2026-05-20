import React from 'react';
import type { useRecoveryValidation } from '../hooks/use_recovery_validation';
interface RecoveryBaseQueryOnlyFieldProps {
    /** Validation state and rules from the consolidated useRecoveryValidation hook. */
    validation: ReturnType<typeof useRecoveryValidation>;
}
/**
 * Recovery base query field (full ES|QL editor).
 *
 * Displayed when the recovery type is `query`.
 * Seeds the recovery query from the evaluation query on mount, and validates
 * ES|QL syntax, grouping fields, and that the recovery query differs from evaluation.
 *
 * Validation logic is provided by the `useRecoveryValidation` hook via the
 * `validation` prop. Seeding is handled locally on mount.
 */
export declare const RecoveryBaseQueryOnlyField: ({ validation }: RecoveryBaseQueryOnlyFieldProps) => React.JSX.Element;
export {};

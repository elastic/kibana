import React from 'react';
interface ConditionFieldGroupProps {
    /**
     * Whether to include the editable base query field.
     * When true, shows an editable ES|QL editor for the base query.
     * When false, shows the base query as read-only (if available).
     */
    includeBase?: boolean;
}
/**
 * Condition field group for configuring alert trigger conditions.
 *
 * This component displays:
 * - An editable ES|QL query editor (when includeBase is true) OR a read-only view of the base query
 *
 * The full ES|QL query defines what data is being evaluated, including any
 * trigger condition (e.g. a trailing WHERE clause).
 */
export declare const ConditionFieldGroup: ({ includeBase }: ConditionFieldGroupProps) => React.JSX.Element;
export {};

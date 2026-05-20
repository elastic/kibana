import React from 'react';
import type { FormValues } from './types';
import type { RuleFormServices, RuleFormLayout } from './contexts';
export interface DynamicRuleFormProps {
    /** The query that drives form values - changes will sync to form state */
    query: string;
    services: RuleFormServices;
    /** Layout mode: 'page' renders the preview side-by-side; 'flyout' uses a nested flyout. Default: 'page'. */
    layout?: RuleFormLayout;
    /**
     * External submit handler. When provided, form submission delegates to this callback.
     * When omitted, the form uses `useCreateRule` internally.
     */
    onSubmit?: (values: FormValues) => void;
    /** Callback invoked after a successful internal submission (useCreateRule). */
    onSuccess?: () => void;
    onCancel?: () => void;
    /** Whether to include YAML editor toggle (default: false) */
    includeYaml?: boolean;
    /** Whether the form is in a loading/disabled state */
    isDisabled?: boolean;
    /** Whether the form is currently submitting (controls button loading state) */
    isSubmitting?: boolean;
    /** Whether to show submit/cancel buttons (default: false) */
    includeSubmission?: boolean;
    submitLabel?: React.ReactNode;
    cancelLabel?: React.ReactNode;
}
/**
 * Dynamic rule form that syncs with external prop changes.
 *
 * Use this component when the form needs to react to external state changes,
 * such as when embedded in Discover where the query can change.
 *
 * The time field is automatically derived from the query's available date fields
 * by the TimeFieldSelect component (preferring @timestamp if available).
 *
 * The query is the only externally-driven field; a useEffect syncs it via
 * setValue when the prop changes. All other fields are internally managed.
 */
export declare const DynamicRuleForm: ({ query, services, layout, onSubmit, onSuccess, includeYaml, isDisabled, isSubmitting, includeSubmission, onCancel, submitLabel, cancelLabel, }: DynamicRuleFormProps) => React.JSX.Element;

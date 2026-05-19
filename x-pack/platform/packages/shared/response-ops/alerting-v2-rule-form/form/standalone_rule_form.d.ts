import React from 'react';
import type { FormValues } from './types';
import type { RuleFormServices, RuleFormLayout } from './contexts';
export interface StandaloneRuleFormProps {
    /** Initial query for the rule */
    query: string;
    services: RuleFormServices;
    /** Layout mode: 'page' renders the preview side-by-side; 'flyout' uses a nested flyout. Default: 'page'. */
    layout?: RuleFormLayout;
    /**
     * External submit handler. When provided, form submission delegates to this callback.
     * When omitted (and `includeSubmission` is true), the form uses `useCreateRule` internally.
     */
    onSubmit?: (values: FormValues) => void;
    /** Callback invoked after a successful internal submission (useCreateRule). */
    onSuccess?: () => void;
    onCancel?: () => void;
    /** Whether to include YAML editor toggle (default: false). Requires services.application. */
    includeYaml?: boolean;
    /** Whether the form is in a loading/disabled state */
    isDisabled?: boolean;
    /** Whether the form is currently submitting (controls button loading state) */
    isSubmitting?: boolean;
    /** Whether to show submit/cancel buttons (default: false) */
    includeSubmission?: boolean;
    submitLabel?: React.ReactNode;
    cancelLabel?: React.ReactNode;
    /**
     * Optional initial form values to populate the form with (e.g. when editing an existing rule).
     * These are shallow-merged over the query-derived defaults.
     */
    initialValues?: Partial<FormValues>;
    /** When provided, the form operates in edit mode and uses PATCH instead of POST on submission. */
    ruleId?: string;
}
/**
 * Standalone rule form with static initialization.
 *
 * Use this component for a classic flyout experience where the user controls
 * everything from the form after initial mount. External prop changes are ignored.
 *
 * When `onSubmit` is provided, form submission delegates to that callback.
 * When `onSubmit` is omitted and `includeSubmission` is true, the form
 * automatically persists the rule via the API and calls `onSuccess` afterwards.
 * If `ruleId` is provided the internal submission uses PATCH (update) instead of POST (create).
 *
 * Uses react-hook-form's `defaultValues` for static initialization.
 * Time field is auto-selected by TimeFieldSelect based on available date fields.
 */
export declare const StandaloneRuleForm: ({ query, services, layout, onSubmit, onSuccess, includeYaml, isDisabled, isSubmitting, includeSubmission, onCancel, submitLabel, cancelLabel, initialValues, ruleId, }: StandaloneRuleFormProps) => React.JSX.Element;

import React from 'react';
import type { FormValues } from './types';
import { type RuleFormServices, type RuleFormLayout } from './contexts';
export type { RuleFormServices } from './contexts';
export interface RuleFormProps {
    services: RuleFormServices;
    /** Layout mode: 'page' renders the preview side-by-side; 'flyout' uses a nested flyout. Default: 'page'. */
    layout?: RuleFormLayout;
    /**
     * External submit handler. When provided, form submission delegates to this callback.
     * When omitted and `includeSubmission` is true, the form uses `useCreateRule` internally.
     */
    onSubmit?: (values: FormValues) => void;
    /** Callback invoked after a successful internal submission (useCreateRule). */
    onSuccess?: () => void;
    onCancel?: () => void;
    /** Whether to include the ES|QL query editor (default: true) */
    includeQueryEditor?: boolean;
    /** Whether to include YAML editor toggle (default: false) */
    includeYaml?: boolean;
    isDisabled?: boolean;
    /** Whether the form is currently submitting (controls button loading state) */
    isSubmitting?: boolean;
    /** Whether to show submit/cancel buttons (default: false) */
    includeSubmission?: boolean;
    submitLabel?: React.ReactNode;
    cancelLabel?: React.ReactNode;
    /** When provided, the form operates in edit mode and uses PATCH instead of POST on submission. */
    ruleId?: string;
}
/**
 * Stateless rule form component.
 *
 * This component renders form fields and expects a FormProvider context to exist.
 * It does not manage form state - that responsibility belongs to the parent component
 * (DynamicRuleForm or StandaloneRuleForm).
 *
 * When `onSubmit` is provided, form submission is delegated to that callback.
 * When `onSubmit` is omitted, the form uses `useCreateRule` internally and
 * calls `onSuccess` after a successful API save.
 *
 * Includes its own QueryClientProvider for react-query hooks used by field components.
 * Services and layout metadata are provided via RuleFormProvider context, eliminating prop drilling.
 */
export declare const RuleForm: ({ layout, ...props }: RuleFormProps) => React.JSX.Element;

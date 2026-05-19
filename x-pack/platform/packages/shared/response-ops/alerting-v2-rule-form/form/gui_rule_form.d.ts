import React from 'react';
import type { FormValues } from './types';
export interface GuiRuleFormProps {
    onSubmit: (values: FormValues) => void;
    /** Whether to include the ES|QL query editor (default: true) */
    includeQueryEditor?: boolean;
    /** Whether the form is editing an existing rule (disables immutable fields like kind) */
    isEditing?: boolean;
}
/**
 * GUI-based rule form with standard form fields.
 *
 * This component renders the visual form interface with field groups for:
 * - Rule details (name, tags, description — no wrapper panel)
 * - Rule evaluation (full ES|QL query)
 * - Rule execution settings (schedule, lookback)
 * - Rule kind (alert vs monitor)
 * - Alert conditions (alert delay, recovery policy, recovery delay)
 *
 * Requires a FormProvider context with FormValues type to be present in the component tree.
 */
export declare const GuiRuleForm: ({ onSubmit, includeQueryEditor, isEditing, }: GuiRuleFormProps) => React.JSX.Element;

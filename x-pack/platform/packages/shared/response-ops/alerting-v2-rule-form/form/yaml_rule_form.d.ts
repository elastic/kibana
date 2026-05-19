import React from 'react';
import type { FormValues } from './types';
import type { RuleFormServices } from './contexts';
import { formValuesToYamlObject, parseYamlToFormValues, serializeFormToYaml } from './utils/yaml_form_utils';
export { formValuesToYamlObject, parseYamlToFormValues, serializeFormToYaml };
export interface YamlRuleFormProps {
    services: RuleFormServices;
    /** Optional submit handler. In the compose-discover flyout context, save is
     *  handled externally via methods.handleSubmit() — no onSubmit needed. The
     *  standalone RuleForm still passes this to handle its own submit flow. */
    onSubmit?: (values: FormValues) => void;
    isDisabled?: boolean;
    isSubmitting?: boolean;
    /** YAML buffer, lifted to the parent so it survives Form↔YAML toggle. */
    yamlText: string;
    /** Setter for the lifted YAML buffer. */
    setYamlText: (yaml: string) => void;
}
/**
 * YAML-based rule form editor.
 *
 * Provides a YAML editor for editing rule configuration with ES|QL autocomplete.
 * Parsing is always lenient — YAML syntax errors are surfaced, but missing
 * required fields get safe defaults. Field-level validation is handled by RHF
 * at submit time through `methods.handleSubmit()`.
 *
 * In the compose-discover flyout context, the parent owns submission and
 * passes a debounced `setYamlText` that also syncs into RHF on every
 * keystroke. The blur handler here acts as a "flush now" fallback.
 *
 * In the standalone RuleForm context, the parent passes `onSubmit` and
 * this component renders an `<EuiForm>` with its own submit handler.
 */
export declare const YamlRuleForm: ({ services, onSubmit, isDisabled, isSubmitting, yamlText, setYamlText, }: YamlRuleFormProps) => React.JSX.Element;

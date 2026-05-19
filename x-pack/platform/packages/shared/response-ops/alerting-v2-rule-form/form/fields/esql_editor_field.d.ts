import React from 'react';
declare const EDITOR_HEIGHT_INLINE = 140;
declare const EDITOR_HEIGHT_DEFAULT = 80;
/** Allowed field paths for ES|QL query fields */
type EsqlQueryFieldPath = 'evaluation.query.base' | 'recoveryPolicy.query.base';
export interface EsqlEditorFieldProps {
    /** The field path in the form - constrained to valid ES|QL query field paths */
    name: EsqlQueryFieldPath;
    /** Label displayed above the field */
    label?: React.ReactNode;
    /** Optional tooltip content displayed next to the label */
    labelTooltip?: string;
    /** Accessible label for screen readers (required if no visible label) */
    ariaLabel?: string;
    /** Optional help text displayed below the field */
    helpText?: React.ReactNode;
    /** Placeholder text for the input */
    placeholder?: string;
    /** Height of the editor (default: 140 for flyouts) */
    height?: string | number;
    /** Whether the field should take full width */
    fullWidth?: boolean;
    /** Data test subject for testing */
    dataTestSubj?: string;
    /** Whether the field is disabled */
    disabled?: boolean;
    /** Whether the field is read-only */
    readOnly?: boolean;
    /** Validation rules for react-hook-form */
    rules?: {
        required?: string;
        /** Validation function - can be sync or async. Return true for valid, or error string for invalid. */
        validate?: (value: string | null | undefined) => string | boolean | Promise<string | boolean>;
    };
    /** Server-side errors to display in the editor */
    errors?: Error[];
    /** Server-side warning to display in the editor */
    warning?: string;
}
/**
 * An ES|QL editor field component using the full ESQLLangEditor with syntax highlighting,
 * autocomplete, and validation. Uses react-hook-form Controller for form integration.
 *
 * Features:
 * - Full ES|QL syntax highlighting and autocomplete
 * - Real-time client-side validation with error markers
 * - Server-side error/warning display
 * - Query history support
 * - Inline editing mode optimized for flyouts
 *
 * @example
 * ```tsx
 * <EsqlEditorField
 *   name="evaluation.query.base"
 *   label="Query"
 *   placeholder="FROM logs-* | WHERE ..."
 *   rules={{
 *     required: 'Query is required',
 *     validate: (value) => validateEsqlQuery(value) ?? true,
 *   }}
 * />
 * ```
 */
export declare const EsqlEditorField: ({ name, label, labelTooltip, helpText, height, fullWidth, dataTestSubj, disabled, readOnly, rules, errors: serverErrors, warning: serverWarning, }: EsqlEditorFieldProps) => React.JSX.Element;
export { EDITOR_HEIGHT_INLINE, EDITOR_HEIGHT_DEFAULT };

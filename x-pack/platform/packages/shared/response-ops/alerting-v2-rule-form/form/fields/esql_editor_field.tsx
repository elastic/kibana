/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiIconTip } from '@elastic/eui';
import { Controller, useFormContext } from 'react-hook-form';
import { CodeEditorField } from '@kbn/code-editor';
import type { FormValues } from '../types';

// Standard ES|QL editor heights from @kbn/esql-editor
const EDITOR_HEIGHT_INLINE = 140; // For inline editing/flyouts
const EDITOR_HEIGHT_DEFAULT = 80; // Minimal editor

/** Allowed field paths for ES|QL query fields */
type EsqlQueryFieldPath = 'evaluation.query.base'; // | 'recovery_policy.query.base' in the future

// Standard ES|QL editor Monaco options
const ESQL_EDITOR_OPTIONS = {
  fontSize: 14,
  lineHeight: 22,
  lineNumbers: 'on' as const,
  folding: false,
  automaticLayout: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  wordWrap: 'on' as const,
  wrappingIndent: 'none' as const,
  padding: { top: 8, bottom: 8 },
  renderLineHighlight: 'line' as const,
  scrollbar: {
    horizontal: 'hidden' as const,
    vertical: 'auto' as const,
  },
};

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
  /** Height of the editor (default: 140 for flyouts, 80 for minimal) */
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
    validate?: (value: string) => string | boolean | true;
  };
}

/**
 * An ES|QL editor field component using Monaco with ES|QL syntax highlighting.
 * Uses react-hook-form Controller for form integration.
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
export const EsqlEditorField: React.FC<EsqlEditorFieldProps> = ({
  name,
  label,
  labelTooltip,
  ariaLabel,
  helpText,
  placeholder,
  height = EDITOR_HEIGHT_INLINE,
  fullWidth = true,
  dataTestSubj,
  disabled = false,
  readOnly = false,
  rules,
}) => {
  const { control } = useFormContext<FormValues>();

  const labelElement = label ? (
    labelTooltip ? (
      <>
        {label}
        &nbsp;
        <EuiIconTip position="right" type="question" content={labelTooltip} />
      </>
    ) : (
      label
    )
  ) : undefined;

  const editorOptions = {
    ...ESQL_EDITOR_OPTIONS,
    readOnly: readOnly || disabled,
  };

  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field, fieldState }) => (
        <EuiFormRow
          label={labelElement}
          helpText={helpText}
          isInvalid={!!fieldState.error}
          error={fieldState.error?.message}
          fullWidth={fullWidth}
        >
          <CodeEditorField
            languageId="esql"
            value={(field.value as string) ?? ''}
            onChange={(newValue) => field.onChange(newValue || undefined)}
            height={height}
            fullWidth={fullWidth}
            placeholder={placeholder}
            options={editorOptions}
            dataTestSubj={dataTestSubj}
            aria-label={ariaLabel}
          />
        </EuiFormRow>
      )}
    />
  );
};

// Export standard heights for consumers
export { EDITOR_HEIGHT_INLINE, EDITOR_HEIGHT_DEFAULT };

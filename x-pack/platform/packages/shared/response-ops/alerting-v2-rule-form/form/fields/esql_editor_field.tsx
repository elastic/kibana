/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiIconTip } from '@elastic/eui';
import { Controller, useFormContext, type FieldPath, type FieldValues } from 'react-hook-form';
import { CodeEditorField } from '@kbn/code-editor';

// Standard ES|QL editor heights from @kbn/esql-editor
const EDITOR_HEIGHT_INLINE = 140; // For inline editing/flyouts
const EDITOR_HEIGHT_DEFAULT = 80; // Minimal editor

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

interface BaseEsqlEditorFieldProps {
  /** Label displayed above the field */
  label?: React.ReactNode;
  /** Optional tooltip content displayed next to the label */
  labelTooltip?: string;
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
  /** Error message to display */
  error?: React.ReactNode;
}

interface ControlledEsqlEditorFieldProps extends BaseEsqlEditorFieldProps {
  /** Controlled value */
  value: string;
  /** Controlled onChange handler */
  onChange: (value: string) => void;
  /** Field name is not required in controlled mode */
  name?: never;
}

interface UncontrolledEsqlEditorFieldProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseEsqlEditorFieldProps {
  /** The field path in the form (e.g., 'recoveryPolicy.query') */
  name: FieldPath<TFieldValues>;
  /** Value is not used in uncontrolled mode */
  value?: never;
  /** onChange is not used in uncontrolled mode */
  onChange?: never;
}

export type EsqlEditorFieldProps<TFieldValues extends FieldValues = FieldValues> =
  | ControlledEsqlEditorFieldProps
  | UncontrolledEsqlEditorFieldProps<TFieldValues>;

/**
 * A generic ES|QL editor field component using Monaco with ES|QL syntax highlighting.
 * Uses standard Kibana ES|QL editor styling (fontSize: 14, lineHeight: 22).
 *
 * Supports two modes:
 * - **Controlled mode**: Pass `value` and `onChange` props directly
 * - **Uncontrolled mode**: Pass `name` prop to use with react-hook-form context
 *
 * @example Controlled mode (for use in flyouts with local state)
 * ```tsx
 * <EsqlEditorField
 *   value={draftQuery}
 *   onChange={setDraftQuery}
 *   label="Recovery query"
 *   placeholder="FROM logs-* | WHERE ..."
 * />
 * ```
 *
 * @example Uncontrolled mode (for use with react-hook-form)
 * ```tsx
 * <EsqlEditorField
 *   name="recoveryPolicy.query"
 *   label="Recovery query"
 *   placeholder="FROM logs-* | WHERE ..."
 * />
 * ```
 */
export const EsqlEditorField = <TFieldValues extends FieldValues = FieldValues>({
  name,
  value,
  onChange,
  label,
  labelTooltip,
  helpText,
  placeholder,
  height = EDITOR_HEIGHT_INLINE,
  fullWidth = true,
  dataTestSubj,
  disabled = false,
  readOnly = false,
  error,
}: EsqlEditorFieldProps<TFieldValues>): React.ReactElement => {
  const labelElement = labelTooltip ? (
    <>
      {label}
      &nbsp;
      <EuiIconTip position="right" type="question" content={labelTooltip} />
    </>
  ) : (
    label
  );

  const editorOptions = {
    ...ESQL_EDITOR_OPTIONS,
    readOnly: readOnly || disabled,
  };

  // Controlled mode: value and onChange are provided
  if (value !== undefined && onChange !== undefined) {
    return (
      <EuiFormRow
        label={labelElement}
        helpText={helpText}
        isInvalid={!!error}
        error={error}
        fullWidth={fullWidth}
      >
        <CodeEditorField
          languageId="esql"
          value={value}
          onChange={onChange}
          height={height}
          fullWidth={fullWidth}
          placeholder={placeholder}
          options={editorOptions}
          dataTestSubj={dataTestSubj}
        />
      </EuiFormRow>
    );
  }

  // Uncontrolled mode: use react-hook-form context
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { control } = useFormContext<TFieldValues>();

  return (
    <Controller
      control={control}
      name={name!}
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
          />
        </EuiFormRow>
      )}
    />
  );
};

// Export standard heights for consumers
export { EDITOR_HEIGHT_INLINE, EDITOR_HEIGHT_DEFAULT };

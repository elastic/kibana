/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useId, useState, type ReactElement, type ReactNode } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPopover,
  EuiSelect,
  EuiTextArea,
  EuiToolTip,
  type EuiSelectOption,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface FieldProps<T> {
  label: string;
  value: T;
  onChange: (value: T) => void;
  helpText?: ReactNode;
  error?: string;
}

/**
 * A form row with an id of its own. A row left to generate one can end up sharing it with
 * another, which breaks the link between a label and its field.
 */
export const FormRow = ({
  label,
  helpText,
  error,
  hasEmptyLabelSpace,
  fullWidth,
  children,
}: {
  label?: string;
  helpText?: ReactNode;
  error?: string;
  /** Leaves room for a label, so a button lines up with the fields beside it. */
  hasEmptyLabelSpace?: boolean;
  fullWidth?: boolean;
  children: ReactElement;
}) => (
  <EuiFormRow
    id={useId()}
    label={label}
    helpText={helpText}
    isInvalid={error !== undefined}
    error={error}
    hasEmptyLabelSpace={hasEmptyLabelSpace}
    fullWidth={fullWidth}
  >
    {children}
  </EuiFormRow>
);

export const TextField = ({
  label,
  value,
  onChange,
  helpText,
  error,
  maxLength,
  placeholder,
  onBlur,
}: FieldProps<string> & {
  maxLength?: number;
  placeholder?: string;
  /** For a field whose value is only acted on once the author has finished typing it. */
  onBlur?: () => void;
}) => (
  <FormRow label={label} helpText={helpText} error={error}>
    <EuiFieldText
      compressed
      fullWidth
      value={value}
      maxLength={maxLength}
      placeholder={placeholder}
      isInvalid={error !== undefined}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
    />
  </FormRow>
);

export const TextAreaField = ({
  label,
  value,
  onChange,
  helpText,
  error,
  maxLength,
  rows = 4,
}: FieldProps<string> & { maxLength?: number; rows?: number }) => (
  <FormRow label={label} helpText={helpText} error={error}>
    <EuiTextArea
      compressed
      fullWidth
      rows={rows}
      value={value}
      maxLength={maxLength}
      isInvalid={error !== undefined}
      onChange={(event) => onChange(event.target.value)}
    />
  </FormRow>
);

export const SelectField = <T extends string>({
  label,
  value,
  onChange,
  options,
  helpText,
  error,
  placeholder,
}: FieldProps<T> & {
  options: ReadonlyArray<{ value: T; text: string }>;
  /** Shown while the value is none of the options, such as an empty one. */
  placeholder?: string;
}) => {
  const known = options.some((option) => option.value === value);
  const allOptions: EuiSelectOption[] = known
    ? [...options]
    : [{ value, text: placeholder ?? value, disabled: true }, ...options];

  return (
    <FormRow label={label} helpText={helpText} error={error}>
      <EuiSelect
        compressed
        fullWidth
        aria-label={label}
        value={value}
        options={allOptions}
        isInvalid={error !== undefined}
        onChange={(event) => onChange(event.target.value as T)}
      />
    </FormRow>
  );
};

/**
 * A text field that can also insert `{{state.key}}` at the end, from a list of the keys the
 * document declares, so authors need not remember the syntax.
 */
export const InterpolatedTextField = ({
  stateKeys,
  multiline = false,
  ...field
}: FieldProps<string> & {
  stateKeys: readonly string[];
  multiline?: boolean;
  maxLength?: number;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const insert = (key: string) => {
    field.onChange(`${field.value}{{state.${key}}}`);
    setIsOpen(false);
  };

  const picker =
    stateKeys.length > 0 ? (
      <EuiPopover
        aria-label={i18n.translate('xpack.customApp.editor.insertValueLabel', {
          defaultMessage: 'Values you can insert',
        })}
        isOpen={isOpen}
        closePopover={() => setIsOpen(false)}
        anchorPosition="downRight"
        button={
          <EuiButtonEmpty size="xs" iconType="plusCircle" onClick={() => setIsOpen(!isOpen)}>
            {i18n.translate('xpack.customApp.editor.insertValue', {
              defaultMessage: 'Insert a value',
            })}
          </EuiButtonEmpty>
        }
      >
        {stateKeys.map((key) => (
          <div key={key}>
            <EuiButtonEmpty size="s" onClick={() => insert(key)}>
              {key}
            </EuiButtonEmpty>
          </div>
        ))}
      </EuiPopover>
    ) : undefined;

  const Field = multiline ? TextAreaField : TextField;
  return <Field {...field} helpText={picker ?? field.helpText} />;
};

interface IconButtonProps {
  label: string;
  iconType: string;
  onClick: () => void;
  color?: 'text' | 'primary' | 'danger';
  isDisabled?: boolean;
  size?: 'xs' | 's' | 'm';
  'data-test-subj'?: string;
}

/** An icon-only button, with its name shown as a tooltip and read by screen readers. */
export const IconButton = ({ label, ...props }: IconButtonProps) => (
  <EuiToolTip content={label} disableScreenReaderOutput>
    <EuiButtonIcon aria-label={label} {...props} />
  </EuiToolTip>
);

/** A removable row in a list editor, with its label for screen readers. */
export const ListRow = ({
  removeLabel,
  onRemove,
  children,
}: {
  removeLabel: string;
  onRemove: () => void;
  children: ReactNode;
}) => (
  <EuiFlexGroup gutterSize="s" alignItems="flexEnd" responsive={false}>
    <EuiFlexItem>{children}</EuiFlexItem>
    <EuiFlexItem grow={false}>
      <IconButton iconType="trash" color="danger" label={removeLabel} onClick={onRemove} />
    </EuiFlexItem>
  </EuiFlexGroup>
);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiComboBoxOptionOption, EuiComboBoxProps } from '@elastic/eui';
import { EuiComboBox } from '@elastic/eui';
import { useController } from 'react-hook-form';
import { FieldRow } from './field_row';
import type { BaseFieldProps } from './types';

type ComboBoxFieldProps = BaseFieldProps & {
  /** Lets the user add values that are not in `options`. */
  isCreatable?: boolean;
  euiFieldProps?: Omit<
    EuiComboBoxProps<string>,
    'selectedOptions' | 'onChange' | 'onBlur' | 'isInvalid' | 'onCreateOption'
  >;
};

/** The form value is always the array of selected option labels, also with `singleSelection`. */
export const ComboBoxField = ({
  name,
  isCreatable = false,
  euiFieldProps,
  ...rowProps
}: ComboBoxFieldProps) => {
  const { field, fieldState } = useController<Record<string, string[] | undefined>>({ name });
  const { options = [] } = euiFieldProps ?? {};
  const { value, onChange } = field;

  const selectedOptions = useMemo(
    () =>
      (value ?? []).map((label) => options.find((option) => option.label === label) ?? { label }),
    [value, options]
  );

  const handleChange = useCallback(
    (selected: Array<EuiComboBoxOptionOption<string>>) =>
      onChange(selected.map(({ label }) => label)),
    [onChange]
  );

  const handleCreateOption = useCallback(
    (searchValue: string) => {
      const label = searchValue.trim();
      if (label === '') return;
      onChange(euiFieldProps?.singleSelection ? [label] : [...new Set([...(value ?? []), label])]);
    },
    [value, onChange, euiFieldProps?.singleSelection]
  );

  return (
    <FieldRow fieldState={fieldState} {...rowProps}>
      <EuiComboBox
        fullWidth
        data-test-subj={rowProps['data-test-subj']}
        {...euiFieldProps}
        onCreateOption={isCreatable ? handleCreateOption : undefined}
        inputRef={field.ref}
        selectedOptions={selectedOptions}
        onChange={handleChange}
        onBlur={field.onBlur}
        isInvalid={Boolean(fieldState.error)}
      />
    </FieldRow>
  );
};
ComboBoxField.displayName = 'ComboBoxField';

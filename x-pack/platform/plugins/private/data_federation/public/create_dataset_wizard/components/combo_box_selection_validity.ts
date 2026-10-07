/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect } from 'react';
import {
  useController,
  useFormContext,
  type FieldPath,
  type FieldPathValue,
} from 'react-hook-form';

import type { ComboBoxValidityFlag, CreateDatasetFormValues } from '../create_dataset_form_state';
import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';

export interface ComboBoxChange<T> {
  value: T;
  /** False while the input holds typed text that has not been resolved to an option. */
  isValid: boolean;
}

/** Binds a combo box form field so unresolved typed text in it fails validation. */
export const useComboBoxSelectionValidity = <TName extends FieldPath<CreateDatasetFormValues>>({
  name,
  flag,
  isEnforced = () => true,
  deps,
}: {
  name: TName;
  flag: ComboBoxValidityFlag;
  /** Whether unresolved typed text currently fails validation, e.g. false while the input is disabled. */
  isEnforced?: (values: CreateDatasetFormValues) => boolean;
  deps?: Array<FieldPath<CreateDatasetFormValues>>;
}) => {
  const { control, clearErrors } = useFormContext<CreateDatasetFormValues>();
  const { field, fieldState } = useController({
    name,
    control,
    rules: {
      deps,
      validate: (_value, values) =>
        values.ui[flag] === false && isEnforced(values)
          ? createDatasetWizardStrings.comboBoxSelectValidOption
          : true,
    },
  });
  const {
    field: { onChange: setIsValid },
  } = useController({ name: `ui.${flag}`, control });
  const { onChange: setValue } = field;

  const onChange = useCallback(
    ({ value, isValid }: ComboBoxChange<FieldPathValue<CreateDatasetFormValues, TName>>) => {
      setValue(value);
      setIsValid(isValid);
    },
    [setValue, setIsValid]
  );

  /** Discards unresolved typed text: marks the selection valid and clears the error it caused. */
  const reset = useCallback(() => {
    setIsValid(true);
    clearErrors(name);
  }, [setIsValid, clearErrors, name]);

  // The combo box's typed text does not survive unmounting, so neither should its flag or error.
  useEffect(() => reset, [reset]);

  return { field, fieldState, onChange, reset };
};

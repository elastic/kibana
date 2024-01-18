/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';

import type { FormField } from './form_field';

import type { FormSlice, State } from './form_slice';

// Checks each form field for error messages to return
// if the overall form is valid or not.
const isFormValid = <FF extends string, FS extends string, VN extends string>(
  formFields: State<FF, FS, VN>['formFields']
) =>
  Object.values(formFields).every((d) => (d as FormField<FF, FS, VN>).errorMessages.length === 0);

const createSelectIsFormValid = <FF extends string, FS extends string, VN extends string>(
  slice: FormSlice<FF, FS, VN>
) =>
  createSelector(
    (state: Record<string, State<FF, FS, VN>>) => state[slice.name].formFields,
    isFormValid
  );

export const useIsFormValid = <FF extends string, FS extends string, VN extends string>(
  slice: FormSlice<FF, FS, VN>
) => {
  const selectIsFormValid = useMemo(() => createSelectIsFormValid(slice), [slice]);
  return useSelector(selectIsFormValid);
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import type { FormSlice, State } from './form_slice';

export const createSelectFormFields =
  <FF extends string, FS extends string, VN extends string>(slice: FormSlice<FF, FS, VN>) =>
  (s: Record<typeof slice.name, State<FF, FS, VN>>) =>
    s[slice.name].formFields;

const createSelectFormField =
  <FF extends string, FS extends string, VN extends string>(
    slice: FormSlice<FF, FS, VN>,
    field: keyof State<FF, FS, VN>['formFields']
  ) =>
  (s: Record<string, State<FF, FS, VN>>) => {
    return s[slice.name].formFields[field];
  };

export const useFormField = <FF extends string, FS extends string, VN extends string>(
  slice: FormSlice<FF, FS, VN>,
  field: keyof State<FF, FS, VN>['formFields']
) => {
  const selectFormField = useMemo(() => createSelectFormField(slice, field), [slice, field]);
  return useSelector(selectFormField);
};

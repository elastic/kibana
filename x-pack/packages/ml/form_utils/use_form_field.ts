/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import type { State } from './form_slice';

export const createSelectFormFields =
  <FF extends string, FS extends string, VN extends string, S extends State<FF, FS, VN>>(
    stateAccessor: string
  ) =>
  (s: Record<string, S>) =>
    s[stateAccessor].formFields;

const createSelectFormField =
  <FF extends string, FS extends string, VN extends string, S extends State<FF, FS, VN>>(
    stateAccessor: string,
    field: keyof S['formFields']
  ) =>
  (s: Record<string, S>) => {
    return s[stateAccessor].formFields[field as FF];
  };

export const useFormField = <
  FF extends string,
  FS extends string,
  VN extends string,
  S extends State<FF, FS, VN>
>(
  stateAccessor: string,
  field: keyof S['formFields']
) => {
  const selectFormField = useMemo(
    () => createSelectFormField(stateAccessor, field),
    [stateAccessor, field]
  );
  return useSelector(selectFormField);
};

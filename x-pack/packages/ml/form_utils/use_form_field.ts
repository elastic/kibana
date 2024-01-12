/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import type { State } from './redux_actions';

export const selectFormFields = <
  FF extends string,
  FS extends string,
  VN extends string,
  S extends State<FF, FS, VN>
>(
  s: S
) => s.formFields;

const createSelectFormField =
  <FF extends string, FS extends string, VN extends string, S extends State<FF, FS, VN>>(
    field: FF
  ) =>
  (s: S) =>
    s.formFields[field];

export const useFormField = <FF extends string>(field: FF) => {
  const selectFormField = useMemo(() => createSelectFormField(field), [field]);
  return useSelector(selectFormField);
};

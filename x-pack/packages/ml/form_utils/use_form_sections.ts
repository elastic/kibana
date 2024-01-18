/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import type { FormSlice, State } from './form_slice';

export const createSelectFormSections =
  <FF extends string, FS extends string, VN extends string>(slice: FormSlice<FF, FS, VN>) =>
  (s: Record<typeof slice.name, State<FF, FS, VN>>) => {
    return s[slice.name].formSections;
  };

const createSelectFormSection =
  <FF extends string, FS extends string, VN extends string>(
    slice: FormSlice<FF, FS, VN>,
    section: keyof ReturnType<FormSlice<FF, FS, VN>['getInitialState']>['formSections']
  ) =>
  (s: Record<string, State<FF, FS, VN>>) => {
    return s[slice.name].formSections[section as FS];
  };

export const useFormSections = <FF extends string, FS extends string, VN extends string>(
  slice: FormSlice<FF, FS, VN>
) => {
  const selectFormSections = useMemo(() => createSelectFormSections(slice), [slice]);
  return useSelector(selectFormSections);
};

export const useFormSection = <FF extends string, FS extends string, VN extends string>(
  slice: FormSlice<FF, FS, VN>,
  section: keyof ReturnType<FormSlice<FF, FS, VN>['getInitialState']>['formSections']
) => {
  const selectFormSection = useMemo(
    () => createSelectFormSection(slice, section),
    [slice, section]
  );
  return useSelector(selectFormSection);
};

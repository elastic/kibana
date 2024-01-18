/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import { useMemo } from 'react';

import { createSelector } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';

import { createFormFieldsMap, type FormField } from './form_field';
import { createFormSectionsMap, type FormSection } from './form_section';
import { createSelectFormFields } from './use_form_field';
import { createSelectFormSections } from './use_form_sections';

import type { FormSlice, State } from './form_slice';

const getFieldValues = <
  FF extends string,
  FS extends string,
  VN extends string,
  S extends State<FF, FS, VN>
>(
  fields: S['formFields']
) => Object.values(fields).map((f) => (f as FormField<FF, FS, VN>).value);

const getSectionValues = <
  FF extends string,
  FS extends string,
  VN extends string,
  S extends State<FF, FS, VN>
>(
  sections: S['formSections']
) => Object.values(sections).map((s) => (s as FormSection<FS>).enabled);

const isFormTouched = <FF extends string, FS extends string, VN extends string>(
  defaultState: State<FF, FS, VN>,
  formFields: State<FF, FS, VN>['formFields'],
  formSections: State<FF, FS, VN>['formSections']
) => {
  return (
    !isEqual(getFieldValues(defaultState.formFields), getFieldValues(formFields)) ||
    !isEqual(getSectionValues(defaultState.formSections), getSectionValues(formSections))
  );
};

const createSelectIsFormTouched = <FF extends string, FS extends string, VN extends string>(
  slice: FormSlice<FF, FS, VN>,
  defaultState: State<FF, FS, VN>
) =>
  createSelector(
    createSelectFormFields<FF, FS, VN>(slice),
    createSelectFormSections<FF, FS, VN>(slice),
    (formFields, formSections) => isFormTouched(defaultState, formFields, formSections)
  );

export const useIsFormTouched = <FF extends string, FS extends string, VN extends string>(
  slice: FormSlice<FF, FS, VN>,
  defaultState: {
    formFieldsArr: Array<FormField<FF, FS, VN>>;
    formSectionsArr: Array<FormSection<FS>>;
  }
) => {
  const selectIsFormTouched = useMemo(
    () =>
      createSelectIsFormTouched(slice, {
        formFields: createFormFieldsMap(defaultState.formFieldsArr),
        formSections: createFormSectionsMap(defaultState.formSectionsArr),
      } as State<FF, FS, VN>),
    [slice, defaultState]
  );
  return useSelector(selectIsFormTouched);
};

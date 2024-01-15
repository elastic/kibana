/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { Draft } from '@reduxjs/toolkit';

import type { FormField, FormFieldsState } from './form_field';
import type { FormSection, FormSectionsState } from './form_section';
import type { Validator } from './validator';

export interface State<FF extends string, FS extends string, VN extends string> {
  formFields: FormFieldsState<FF, FS, VN>;
  formSections: FormSectionsState<FS>;
  submitErrorMessage?: string;
}

export function createFormSlice<
  FF extends string,
  FS extends string,
  VN extends string,
  S extends State<FF, FS, VN>
>(name: string, getDefaultState: () => S, validators: Record<VN, Validator>) {
  function isFormFieldOptional(state: Draft<S>, field: keyof Draft<S>['formFields']): boolean {
    const formField = state.formFields[field] as FormField<FF, FS, VN>;

    let isOptional = formField.isOptional;
    if (formField.section) {
      const section = state.formSections[
        formField.section as keyof Draft<S>['formSections']
      ] as FormSection<FS>;
      if (section.enabled && formField.isOptionalInSection === false) {
        isOptional = false;
      }
    }

    return isOptional;
  }

  function getFormFieldErrorMessages(
    value: string,
    validatorName: VN,
    isOptional: boolean,
    reservedValues: string[] = []
  ) {
    return isOptional && typeof value === 'string' && value.length === 0
      ? []
      : validators[validatorName](value, isOptional, reservedValues);
  }

  return createSlice({
    name,
    initialState: getDefaultState(),
    reducers: {
      initialize: (state, action: PayloadAction<Draft<S>>) => {
        return (state = action.payload);
      },
      setFormField: (
        state,
        action: PayloadAction<{ field: keyof Draft<S>['formFields']; value: string }>
      ) => {
        const formField = state.formFields[action.payload.field] as FormField<FF, FS, VN>;
        const isOptional = isFormFieldOptional(state, action.payload.field);

        formField.errorMessages = getFormFieldErrorMessages(
          action.payload.value,
          formField.validator,
          isOptional,
          formField.reservedValues
        );

        formField.value = action.payload.value;
      },
      setFormSection: (
        state,
        action: PayloadAction<{ section: keyof Draft<S>['formSections']; enabled: boolean }>
      ) => {
        (state.formSections[action.payload.section] as FormSection<FS>).enabled =
          action.payload.enabled;

        // After a section change we re-evaluate all form fields, since optionality
        // of a field could change if a section got toggled.
        (Object.entries(state.formFields) as Array<[FF, FormField<FF, FS, VN>]>).forEach(
          ([formFieldName, formField]) => {
            const isOptional = isFormFieldOptional(
              state,
              formFieldName as keyof Draft<S>['formFields']
            );
            formField.errorMessages = getFormFieldErrorMessages(
              formField.value,
              formField.validator,
              isOptional,
              formField.reservedValues
            );
          }
        );
      },
      setSubmitErrorMessage: (state, action: PayloadAction<string | undefined>) => {
        state.submitErrorMessage = action.payload;
      },
    },
  });
}

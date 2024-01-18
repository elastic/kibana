/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { Draft } from '@reduxjs/toolkit';

import { createFormFieldsMap, type FormField } from './form_field';
import { createFormSectionsMap, type FormSection } from './form_section';
import type { Validator } from './validator';

export function createFormSlice<FF extends string, FS extends string, VN extends string>(
  name: string,
  formFieldsArr: Array<FormField<FF, FS, VN>>,
  formSectionsArr: Array<FormSection<FS>>,
  validators: Record<VN, Validator>
) {
  const formFields = createFormFieldsMap(formFieldsArr);
  const formSections = createFormSectionsMap(formSectionsArr);

  const initialState = {
    formFields,
    formSections,
    submitErrorMessage: undefined as string | undefined,
  };

  function isFormFieldOptional(
    state: Draft<typeof initialState>,
    field: keyof Draft<typeof initialState>['formFields']
  ): boolean {
    const formField = state.formFields[field] as FormField<FF, FS, VN>;

    let isOptional = formField.isOptional;
    if (formField.section) {
      const section = state.formSections[
        formField.section as keyof Draft<typeof initialState>['formSections']
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
    initialState,
    reducers: {
      initialize: (
        state,
        action: PayloadAction<{
          formFieldsArr: Array<FormField<FF, FS, VN>>;
          formSectionsArr: Array<FormSection<FS>>;
        }>
      ) => {
        state.formFields = createFormFieldsMap(action.payload.formFieldsArr) as Draft<
          Record<FF, FormField<FF, FS, VN>>
        >;
        state.formSections = createFormSectionsMap(action.payload.formSectionsArr) as Draft<
          Record<FS, FormSection<FS>>
        >;
      },
      setFormField: (
        state,
        action: PayloadAction<{
          field: keyof Draft<typeof initialState>['formFields'];
          value: string;
        }>
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
        action: PayloadAction<{
          section: keyof Draft<typeof initialState>['formSections'];
          enabled: boolean;
        }>
      ) => {
        (state.formSections[action.payload.section] as FormSection<FS>).enabled =
          action.payload.enabled;

        // After a section change we re-evaluate all form fields, since optionality
        // of a field could change if a section got toggled.
        (Object.entries(state.formFields) as Array<[FF, FormField<FF, FS, VN>]>).forEach(
          ([formFieldName, formField]) => {
            const isOptional = isFormFieldOptional(
              state,
              formFieldName as keyof Draft<typeof initialState>['formFields']
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

export type FormSlice<FF extends string, FS extends string, VN extends string> = ReturnType<
  typeof createFormSlice<FF, FS, VN>
>;

export type State<FF extends string, FS extends string, VN extends string> = ReturnType<
  FormSlice<FF, FS, VN>['getInitialState']
>;

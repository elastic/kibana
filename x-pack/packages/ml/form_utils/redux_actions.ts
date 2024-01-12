/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PayloadAction } from '@reduxjs/toolkit';

import type { FormField, FormFieldsState } from './form_field';
import type { FormSectionsState } from './form_section';
import type { Validator } from './validator';

export interface State<FF extends string, FS extends string, VN extends string> {
  formFields: FormFieldsState<FF, FS, VN>;
  formSections: FormSectionsState<FS>;
}

export function getFormActions<
  FF extends string,
  FS extends string,
  VN extends string,
  S extends State<FF, FS, VN>
>(validators: Record<VN, Validator>) {
  function isFormFieldOptional(state: S, field: FF) {
    const formField = state.formFields[field];

    let isOptional = formField.isOptional;
    if (formField.section) {
      const section = state.formSections[formField.section];
      if (section.enabled && formField.isOptionalInSection === false) {
        isOptional = false;
      }
    }

    return isOptional;
  }

  function getFormFieldErrorMessages(value: string, isOptional: boolean, validatorName: VN) {
    return isOptional && typeof value === 'string' && value.length === 0
      ? []
      : validators[validatorName](value, isOptional);
  }

  const setFormField = (state: S, action: PayloadAction<{ field: FF; value: string }>) => {
    const formField = state.formFields[action.payload.field];
    const isOptional = isFormFieldOptional(state, action.payload.field);

    formField.errorMessages = getFormFieldErrorMessages(
      action.payload.value,
      isOptional,
      formField.validator
    );

    formField.value = action.payload.value;
  };

  const setFormSection = (state: S, action: PayloadAction<{ section: FS; enabled: boolean }>) => {
    state.formSections[action.payload.section].enabled = action.payload.enabled;

    // After a section change we re-evaluate all form fields, since optionality
    // of a field could change if a section got toggled.
    (Object.entries(state.formFields) as Array<[FF, FormField<FF, FS, VN>]>).forEach(
      ([formFieldName, formField]) => {
        const isOptional = isFormFieldOptional(state, formFieldName);
        formField.errorMessages = getFormFieldErrorMessages(
          formField.value,
          isOptional,
          formField.validator
        );
      }
    );
  };

  return { setFormField, setFormSection };
}

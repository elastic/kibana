/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';

import type { FormFields, FormFieldsState } from '../form_field';

import { selectFormFields } from './form_field';

const retentionPolicyFields: ReadonlySet<FormFields> = new Set([
  'retentionPolicyField',
  'retentionPolicyMaxAge',
]);

const areNonRetentionFieldsValid = (formFields: FormFieldsState) =>
  Object.entries(formFields).every(
    ([fieldName, field]) =>
      retentionPolicyFields.has(fieldName as FormFields) || field.errorMessages.length === 0
  );

const selectAreNonRetentionFieldsValid = createSelector(
  selectFormFields,
  areNonRetentionFieldsValid
);

export const useAreNonRetentionFieldsValid = () => useSelector(selectAreNonRetentionFieldsValid);

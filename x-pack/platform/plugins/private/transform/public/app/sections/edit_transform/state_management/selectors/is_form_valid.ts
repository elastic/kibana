/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';

import type { FormFieldsState } from '../form_field';

import { selectFormFields } from './form_field';

// Checks each form field for error messages to return
// if the overall form is valid or not.
const isFormValid = (formFields: FormFieldsState) =>
  Object.values(formFields).every((d) => d.errorMessages.length === 0);
const selectIsFormValid = createSelector(selectFormFields, isFormValid);
export const useIsFormValid = () => useSelector(selectIsFormValid);

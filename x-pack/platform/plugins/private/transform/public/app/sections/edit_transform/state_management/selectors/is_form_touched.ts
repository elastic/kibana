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

import type { TransformConfigUnion } from '../../../../../../common/types/transform';

import type { FormFieldsState } from '../form_field';
import type { FormSectionsState } from '../form_section';
import { getDefaultState } from '../get_default_state';
import { useEditTransformFlyoutContext } from '../edit_transform_flyout_state';

import { selectFormFields } from './form_field';
import { selectFormSections } from './form_sections';

const getFieldValues = (fields: FormFieldsState) => Object.values(fields).map((f) => f.value);
const getSectionValues = (sections: FormSectionsState) =>
  Object.values(sections).map((s) => s.enabled);

const isFormTouched = (
  config: TransformConfigUnion,
  formFields: FormFieldsState,
  formSections: FormSectionsState
) => {
  const defaultState = getDefaultState(config);
  return (
    !isEqual(getFieldValues(defaultState.formFields), getFieldValues(formFields)) ||
    !isEqual(getSectionValues(defaultState.formSections), getSectionValues(formSections))
  );
};

const createSelectIsFormTouched = (originalConfig: TransformConfigUnion) =>
  createSelector(selectFormFields, selectFormSections, (formFields, formSections) =>
    isFormTouched(originalConfig, formFields, formSections)
  );

export const useIsFormTouched = () => {
  const { config } = useEditTransformFlyoutContext();
  const selectIsFormTouched = useMemo(() => createSelectIsFormTouched(config), [config]);
  return useSelector(selectIsFormTouched);
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';

import { applyFormStateToConfig } from './apply_form_state_to_config';
import type { State } from './form_slice';
import { createSelectFormFields } from './use_form_field';
import { createSelectFormSections } from './use_form_sections';

const createSelectUpdatedConfig = <
  FF extends string,
  FS extends string,
  VN extends string,
  S extends State<FF, FS, VN>,
  OC
>(
  stateAccessor: string,
  originalConfig: OC
) =>
  createSelector(
    createSelectFormFields<FF, FS, VN, S>(stateAccessor),
    createSelectFormSections<FF, FS, VN, S>(stateAccessor),
    (formFields, formSections) => applyFormStateToConfig(originalConfig, formFields, formSections)
  );

export const useUpdatedConfig = <OC>(stateAccessor: string, originalConfig: OC) => {
  const selectUpdatedConfig = useMemo(
    () => createSelectUpdatedConfig(stateAccessor, originalConfig),
    [originalConfig, stateAccessor]
  );
  return useSelector(selectUpdatedConfig);
};

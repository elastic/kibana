/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';

import { getUpdateValue } from './get_update_value';
import type { State } from './form_slice';

// Takes in the form state and returns an object suitable for example to be sent
// to an API endpoint by iterating over `getUpdateValue()`. The function takes care
// of extracting the information from the form state to create the object. It takes
// into account whether a field needs to be included at all in the object (for example,
// if it hadn't been changed). The code is also able to identify relationships/dependencies
// between form fields.
export const applyFormStateToConfig = <FF extends string, FS extends string, VN extends string, C>(
  config: C,
  formFields: State<FF, FS, VN>['formFields'],
  formSections: State<FF, FS, VN>['formSections'],
  extendOriginalConfig = false
): C =>
  // Iterates over all form fields and only if necessary applies them to the final object.
  (Object.keys(formFields) as FF[]).reduce(
    (updateConfig, field) =>
      merge({ ...updateConfig }, getUpdateValue(field, config, formFields, formSections)),
    (extendOriginalConfig ? config : {}) as C
  );

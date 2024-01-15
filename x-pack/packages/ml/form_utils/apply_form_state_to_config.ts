/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';

import { getUpdateValue } from './get_update_value';

import type { FormFieldsState } from './form_field';
import type { FormSectionsState } from './form_section';

// Takes in the form configuration and returns a request object suitable to be sent to the
// transform update API endpoint by iterating over `getUpdateValue()`.
// Once a user hits the update button, this function takes care of extracting the information
// necessary to create the update request. They take into account whether a field needs to
// be included at all in the request (for example, if it hadn't been changed).
// The code is also able to identify relationships/dependencies between form fields.
// For example, if the `pipeline` field was changed, it's necessary to make the `index`
// field part of the request, otherwise the update would fail.
export const applyFormStateToConfig = <FF extends string, FS extends string, VN extends string, C>(
  config: C,
  formFields: FormFieldsState<FF, FS, VN>,
  formSections: FormSectionsState<FS>,
  extendOriginalConfig = false
) =>
  // Iterates over all form fields and only if necessary applies them to
  // the request object used for updating the transform.
  (Object.keys(formFields) as FF[]).reduce(
    (updateConfig, field) =>
      merge({ ...updateConfig }, getUpdateValue(field, config, formFields, formSections)),
    extendOriginalConfig ? config : {}
  );

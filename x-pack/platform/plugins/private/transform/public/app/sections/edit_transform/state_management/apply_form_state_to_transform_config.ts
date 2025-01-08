/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';

import type { PostTransformsUpdateRequestSchema } from '../../../../../server/routes/api_schemas/update_transforms';
import type { TransformConfigUnion } from '../../../../../common/types/transform';

import { getUpdateValue } from './get_update_value';

import type { FormFields, FormFieldsState } from './form_field';
import type { FormSectionsState } from './form_section';

// Takes in the form configuration and returns a request object suitable to be sent to the
// transform update API endpoint by iterating over `getUpdateValue()`.
// Once a user hits the update button, this function takes care of extracting the information
// necessary to create the update request. They take into account whether a field needs to
// be included at all in the request (for example, if it hadn't been changed).
// The code is also able to identify relationships/dependencies between form fields.
// For example, if the `pipeline` field was changed, it's necessary to make the `index`
// field part of the request, otherwise the update would fail.
export const applyFormStateToTransformConfig = (
  config: TransformConfigUnion,
  formFields: FormFieldsState,
  formSections: FormSectionsState
): PostTransformsUpdateRequestSchema =>
  // Iterates over all form fields and only if necessary applies them to
  // the request object used for updating the transform.
  (Object.keys(formFields) as FormFields[]).reduce(
    (updateConfig, field) =>
      merge({ ...updateConfig }, getUpdateValue(field, config, formFields, formSections)),
    {}
  );

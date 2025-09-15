/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FIELD_TYPES, FormSchema } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

export const configureFailureStoreFormSchema: FormSchema = {
  dsFailureStore: {
    type: FIELD_TYPES.TOGGLE,
    defaultValue: false,
  },
};

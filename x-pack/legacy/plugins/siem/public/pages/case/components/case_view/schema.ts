/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema as initialCaseSchema } from '../create/schema';

import { FIELD_TYPES, fieldValidators, FormSchema } from '../shared_imports';
import * as i18n from '../../translations';
const { emptyField } = fieldValidators;

export const schema: FormSchema = {
  ...initialCaseSchema,
  state: {
    type: FIELD_TYPES.SUPER_SELECT,
    label: i18n.STATE,
    validations: [
      {
        validator: emptyField(i18n.STATE_REQUIRED),
      },
    ],
  },
};

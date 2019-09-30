/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormSchema, FIELD_TYPES, VALIDATION_TYPES, fieldValidators } from '../../shared_imports';
import { MappingsConfiguration } from './configuration_form';

const { containsCharsField } = fieldValidators;

export const schema: FormSchema<MappingsConfiguration> = {
  dynamic: {
    label: 'Dynamic field',
    helpText: 'Allow new fields discovery in document.',
    type: FIELD_TYPES.SELECT,
    defaultValue: true,
  },
  date_detection: {
    label: 'Date detection',
    helpText: 'Check if the string field is a date.',
    type: FIELD_TYPES.TOGGLE,
    defaultValue: true,
  },
  numeric_detection: {
    label: 'Numeric field',
    helpText: 'Check if the string field is a numeric value.',
    type: FIELD_TYPES.TOGGLE,
    defaultValue: true,
  },
  dynamic_date_formats: {
    label: 'Dynamic dates format',
    helpText: 'The dynamic_date_formats can be customised to support your own date formats.',
    type: FIELD_TYPES.COMBO_BOX,
    defaultValue: [],
    validations: [
      {
        validator: ({ value }) => {
          if ((value as string[]).length === 0) {
            return {
              message: 'Add at least one',
            };
          }
        },
      },
      {
        validator: containsCharsField({
          message: 'Spaces are not allowed.',
          chars: ' ',
        }),
        type: VALIDATION_TYPES.ARRAY_ITEM,
      },
    ],
  },
};

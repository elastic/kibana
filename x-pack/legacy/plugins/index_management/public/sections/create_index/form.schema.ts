/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormSchema } from 'ui/forms/use_form';
import { emptyField, minLengthField } from 'ui/forms/field_validators';
import { MyForm } from './types';

export const formSchema: FormSchema<MyForm> = {
  name: {
    label: 'Name',
    helpText: 'Help text for the name field',
    fieldsToValidateOnChange: ['name', 'nested.prop'],
    validations: [
      {
        validator: emptyField,
        // Custom error message
        message: 'Custom error message, the name cannot be empty.',
      },
    ],
  },
  title: {
    label: 'Title',
    helpText: 'Help text for the title field',
    validations: [
      {
        // Default message
        validator: emptyField,
      },
      {
        // Custom message
        validator: minLengthField(5),
        message: ({ length }) => `Custom message title: must have minimum length of ${length}`,
      },
    ],
  },
  numeric: {
    label: 'Numeric field',
    helpText: 'Help text for the numeric field',
    type: 'number',
  },
  nested: {
    prop: {
      label: 'Nested prop',
      helpText: 'Help text for the nested prop field',
      fieldsToValidateOnChange: ['name', 'nested.prop'],
      validations: [
        {
          // Custom inline validator
          validator: ({ formData }) => {
            // Read form data to validate field
            if (formData.name.length === 7) {
              return;
            }
            return {
              code: 'ERR_INVALID_TITLE',
              message: 'This field is valid if the "name" field has 7 characters.',
            };
          },
        },
      ],
    },
  },
  comboBoxField: {
    label: 'ComboBox field',
    type: 'comboBox',
    defaultValue: [],
  },
};

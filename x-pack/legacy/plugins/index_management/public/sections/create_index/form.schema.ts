/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  emptyField,
  minLengthField,
  minSelectionField,
} from '../../../../../../../src/plugins/elasticsearch_ui_shared/static/forms/field_validators';
import { multiSelectSelectedValueToOptions } from '../../../../../../../src/plugins/elasticsearch_ui_shared/static/forms/serializers/input_serializers';
import { multiSelectOptionsToSelectedValue } from '../../../../../../../src/plugins/elasticsearch_ui_shared/static/forms/serializers/output_serializers';
import {
  FormSchema,
  FIELD_TYPES,
  ERROR_TYPES,
} from '../../../../../../../src/plugins/elasticsearch_ui_shared/static/forms/hook_form_lib';
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
  country: {
    label: 'Country',
    type: FIELD_TYPES.SELECT,
    validations: [{ validator: emptyField }],
  },
  doWeAgree: {
    label: 'Do we agree on this?',
    type: FIELD_TYPES.TOGGLE,
    defaultValue: false,
  },
  title: {
    label: 'Title',
    helpText: 'Help text for the title field',
    validations: [
      {
        // With default message
        validator: emptyField,
        exitOnFail: true,
      },
      {
        // With custom message
        validator: minLengthField(5),
        message: ({ length }) => `Custom message title: must have minimum length of ${length}`,
      },
    ],
  },
  indexName: {
    label: 'Index name',
    helpText: 'Chose a unique index name',
    isValidationAsync: true,
    validations: [
      { validator: emptyField, exitOnFail: true },
      {
        validator: async ({ value }) => {
          const wait = () => {
            return new Promise(resolve => {
              setTimeout(resolve, 3000);
            });
          };

          // Fake async validation
          await wait();

          if (value !== 'good') {
            return {
              code: 'ERR_INDEX_NAME',
              message: 'The only valid index name you can introduce is "good".',
              type: ERROR_TYPES.ASYNC,
            };
          }
        },
      },
    ],
  },
  numeric: {
    label: 'Numeric field',
    helpText: 'Help text for the numeric field',
    type: FIELD_TYPES.NUMBER,
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
    type: FIELD_TYPES.COMBO_BOX,
    defaultValue: [],
  },
  comboBoxFieldWithValidation: {
    label: 'ComboBox field with validation',
    helpText: 'Try to add a item starting with the letter "a" to see the validation.',
    defaultValue: [],
    type: FIELD_TYPES.COMBO_BOX,
    validations: [
      { validator: emptyField, exitOnFail: true },
      { validator: minLengthField(3), message: 'Please add at least 3 items' },
      {
        validator: ({ value }) => {
          if (typeof value === 'string' && value.startsWith('a')) {
            return {
              code: 'ERR_WRONG_FIRST_CHAR',
              message: 'The value cannot start witht the letter "a"',
              type: ERROR_TYPES.ARRAY_ITEM,
            };
          }
        },
      },
    ],
  },
  selectedIndices: {
    label: 'Select any of the indices below',
    helpText: 'Small demo of a multi select field',
    type: FIELD_TYPES.MULTI_SELECT,
    errorDisplayDelay: 0,
    validations: [{ validator: minSelectionField(2) }],
    inputTransform: multiSelectSelectedValueToOptions,
    outputTransform: multiSelectOptionsToSelectedValue,
  },
};

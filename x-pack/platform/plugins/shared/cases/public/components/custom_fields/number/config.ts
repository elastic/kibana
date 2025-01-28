/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldConfig } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { REQUIRED_FIELD, SAFE_INTEGER_NUMBER_ERROR } from '../translations';

const { emptyField } = fieldValidators;

export const getNumberFieldConfig = ({
  required,
  label,
  defaultValue,
}: {
  required: boolean;
  label: string;
  defaultValue?: number;
}): FieldConfig<number> => {
  const validators = [];

  if (required) {
    validators.push({
      validator: emptyField(REQUIRED_FIELD(label)),
    });
  }

  return {
    ...(defaultValue && { defaultValue }),
    validations: [
      ...validators,
      {
        validator: ({ value }) => {
          if (value == null) {
            return;
          }
          const numericValue = Number(value);

          if (!Number.isSafeInteger(numericValue)) {
            return { message: SAFE_INTEGER_NUMBER_ERROR(label) };
          }
        },
      },
    ],
  };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FIELD_TYPES, type FormSchema } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { i18n } from '@kbn/i18n';

const isInvalidRetention = (value: string) => {
  const num = Number(value);
  return isNaN(num) || num < 1 || num % 1 > 0;
};

export const editFailureStoreFormSchema: FormSchema = {
  failureStore: {
    type: FIELD_TYPES.TOGGLE,
    defaultValue: false,
  },
  periodType: {
    type: FIELD_TYPES.SUPER_SELECT,
    defaultValue: 'default',
  },
  retentionPeriodValue: {
    type: FIELD_TYPES.NUMBER,
    defaultValue: 30,
    validations: [
      {
        validator: ({ value, formData }) => {
          // Only validate when failure store is enabled AND period type is custom
          if (formData.failureStore && formData.periodType === 'custom') {
            if (!value || value <= 0) {
              return {
                message: i18n.translate(
                  'xpack.failureStoreModal.form.retentionPeriodValue.required',
                  {
                    defaultMessage:
                      'Retention period value is required when failure store is enabled.',
                  }
                ),
              };
            }
            if (isInvalidRetention(value)) {
              return {
                message: i18n.translate(
                  'xpack.failureStoreModal.form.retentionPeriodValue.invalid',
                  {
                    defaultMessage: 'A positive integer is required.',
                  }
                ),
              };
            }
          }
          // Explicitly return undefined when validation doesn't apply to clear any previous errors
          return undefined;
        },
      },
    ],
    fieldsToValidateOnChange: ['failureStore', 'periodType', 'retentionPeriodValue'],
  },
  retentionPeriodUnit: {
    type: FIELD_TYPES.SELECT,
    defaultValue: 'd',
  },
};

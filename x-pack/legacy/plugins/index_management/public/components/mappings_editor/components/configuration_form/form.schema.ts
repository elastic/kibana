/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

import { FormSchema, FIELD_TYPES, VALIDATION_TYPES, fieldValidators } from '../../shared_imports';
import { MappingsConfiguration } from '../../reducer';

const { containsCharsField } = fieldValidators;

export const schema: FormSchema<MappingsConfiguration> = {
  dynamic: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dynamicFieldLabel', {
      defaultMessage: 'Dynamic field',
    }),
    helpText: i18n.translate('xpack.idxMgmt.mappingsEditor.dynamicFieldDescription', {
      defaultMessage: 'Allow new fields discovery in document.',
    }),
    type: FIELD_TYPES.SELECT,
    defaultValue: true,
  },
  date_detection: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dateDetectionFieldLabel', {
      defaultMessage: 'Date detection',
    }),
    helpText: i18n.translate('xpack.idxMgmt.mappingsEditor.dateDetectionFieldDescription', {
      defaultMessage: 'Check if the string field is a date.',
    }),
    type: FIELD_TYPES.TOGGLE,
    defaultValue: true,
  },
  numeric_detection: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.numericFieldLabel', {
      defaultMessage: 'Numeric field',
    }),
    helpText: i18n.translate('xpack.idxMgmt.mappingsEditor.numericFieldDescription', {
      defaultMessage: 'Check if the string field is a numeric value.',
    }),
    type: FIELD_TYPES.TOGGLE,
    defaultValue: true,
  },
  dynamic_date_formats: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dynamicDatesFieldLabel', {
      defaultMessage: 'Dynamic dates format',
    }),
    helpText: i18n.translate('xpack.idxMgmt.mappingsEditor.dynamicDatesFieldDescription', {
      defaultMessage:
        'The dynamic_date_formats can be customised to support your own date formats.',
    }),
    type: FIELD_TYPES.COMBO_BOX,
    defaultValue: [],
    validations: [
      {
        validator: containsCharsField({
          message: i18n.translate(
            'xpack.idxMgmt.mappingsEditor.dynamicDatesFieldValidationErrorMessage',
            {
              defaultMessage: 'Spaces are not allowed.',
            }
          ),
          chars: ' ',
        }),
        type: VALIDATION_TYPES.ARRAY_ITEM,
      },
    ],
  },
};

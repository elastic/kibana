/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

import {
  FormSchema,
  FIELD_TYPES,
  VALIDATION_TYPES,
  fieldValidators,
} from '../../../shared_imports';
import { MappingsConfiguration } from '../../../reducer';

const { containsCharsField } = fieldValidators;

export const dynamicMappingSchema: FormSchema<MappingsConfiguration> = {
  dynamic: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.configuration.dynamicFieldLabel', {
      defaultMessage: 'Dynamic field',
    }),
    helpText: i18n.translate('xpack.idxMgmt.mappingsEditor.configuration.dynamicFieldDescription', {
      defaultMessage: 'Allow new fields discovery in a document.',
    }),
    type: FIELD_TYPES.SELECT,
    defaultValue: true,
  },
  date_detection: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.configuration.dateDetectionFieldLabel', {
      defaultMessage: 'Date detection',
    }),
    helpText: i18n.translate(
      'xpack.idxMgmt.mappingsEditor.configuration.dateDetectionFieldDescription',
      {
        defaultMessage: 'Check if the string field is a date.',
      }
    ),
    type: FIELD_TYPES.TOGGLE,
    defaultValue: true,
  },
  numeric_detection: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.configuration.numericFieldLabel', {
      defaultMessage: 'Numeric detection',
    }),
    helpText: i18n.translate('xpack.idxMgmt.mappingsEditor.configuration.numericFieldDescription', {
      defaultMessage: 'Check if the string field is a numeric value.',
    }),
    type: FIELD_TYPES.TOGGLE,
    defaultValue: false,
  },
  dynamic_date_formats: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.configuration.dynamicDatesFieldLabel', {
      defaultMessage: 'Dynamic dates format',
    }),
    helpText: i18n.translate(
      'xpack.idxMgmt.mappingsEditor.configuration.dynamicDatesFieldDescription',
      {
        defaultMessage: 'This field can be customized to support your own date formats.',
      }
    ),
    type: FIELD_TYPES.COMBO_BOX,
    defaultValue: ['strict_date_optional_time', 'yyyy/MM/dd HH:mm:ss Z||yyyy/MM/dd Z'],
    validations: [
      {
        validator: containsCharsField({
          message: i18n.translate(
            'xpack.idxMgmt.mappingsEditor.configuration.dynamicDatesFieldValidationErrorMessage',
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

export const CONFIGURATION_FIELDS = Object.keys(dynamicMappingSchema);

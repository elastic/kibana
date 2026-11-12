/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import type { ValidationFunc } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import * as i18n from './translations';
import {
  MAX_CUSTOM_OBSERVABLE_TYPES_LABEL_LENGTH,
  MAX_OBSERVABLE_TYPE_VALUE_PATTERN_LENGTH,
} from '../../../common/constants';

const { emptyField, maxLengthField } = fieldValidators;

const valuePatternValidator: ValidationFunc<{}, string, string> = ({ value }) => {
  if (!value) {
    return;
  }

  try {
    RegExp(value);
  } catch {
    return { message: i18n.INVALID_VALUE_PATTERN };
  }
};

export const schema = {
  key: {
    validations: [
      {
        validator: emptyField('key'),
      },
    ],
  },
  label: {
    label: i18n.OBSERVABLE_TYPE_LABEL,
    validations: [
      {
        validator: emptyField(i18n.REQUIRED_FIELD(i18n.OBSERVABLE_TYPE_LABEL.toLocaleLowerCase())),
      },
      {
        validator: maxLengthField({
          length: MAX_CUSTOM_OBSERVABLE_TYPES_LABEL_LENGTH,
          message: i18n.MAX_LENGTH_ERROR(
            i18n.OBSERVABLE_TYPE_LABEL.toLocaleLowerCase(),
            MAX_CUSTOM_OBSERVABLE_TYPES_LABEL_LENGTH
          ),
        }),
      },
    ],
  },
  valuePattern: {
    label: i18n.VALUE_PATTERN_LABEL,
    helpText: i18n.VALUE_PATTERN_HELP,
    validations: [
      { validator: valuePatternValidator },
      {
        validator: maxLengthField({
          length: MAX_OBSERVABLE_TYPE_VALUE_PATTERN_LENGTH,
          message: i18n.MAX_LENGTH_ERROR(
            i18n.VALUE_PATTERN_LABEL.toLocaleLowerCase(),
            MAX_OBSERVABLE_TYPE_VALUE_PATTERN_LENGTH
          ),
        }),
      },
    ],
  },
};

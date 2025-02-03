/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import * as i18n from './translations';
import { MAX_CUSTOM_OBSERVABLE_TYPES_LABEL_LENGTH } from '../../../common/constants';

const { emptyField, maxLengthField } = fieldValidators;

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
};

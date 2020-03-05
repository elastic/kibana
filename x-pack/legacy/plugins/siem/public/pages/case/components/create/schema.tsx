/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FIELD_TYPES, fieldValidators, FormSchema } from '../../../shared_imports';
import { OptionalFieldLabel } from './optional_field_label';
import * as i18n from '../../translations';

const { emptyField } = fieldValidators;

export const schema: FormSchema = {
  title: {
    type: FIELD_TYPES.TEXT,
    label: i18n.CASE_TITLE,
    validations: [
      {
        validator: emptyField(i18n.TITLE_REQUIRED),
      },
    ],
  },
  description: {
    type: FIELD_TYPES.TEXTAREA,
    validations: [
      {
        validator: emptyField(i18n.DESCRIPTION_REQUIRED),
      },
    ],
  },
  tags: {
    type: FIELD_TYPES.COMBO_BOX,
    label: i18n.TAGS,
    helpText: i18n.TAGS_HELP,
    labelAppend: OptionalFieldLabel,
  },
};

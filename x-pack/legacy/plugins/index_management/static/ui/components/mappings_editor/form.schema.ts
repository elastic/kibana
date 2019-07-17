/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  FormSchema,
  FIELD_TYPES,
} from '../../../../../../../../src/plugins/elasticsearch_ui_shared/static/forms/hook_form_lib';

export const schema: FormSchema = {
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
};

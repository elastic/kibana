/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DATA_TYPE_DEFINITION } from './data_types_definition';

export const DYNAMIC_SETTING_OPTIONS = [
  { value: true, text: 'true' },
  { value: false, text: 'false' },
  { value: 'strict', text: 'strict' },
];

export const FIELD_TYPES_OPTIONS = Object.entries(DATA_TYPE_DEFINITION).map(
  ([dataType, { label }]) => ({
    value: dataType,
    text: label,
  })
);

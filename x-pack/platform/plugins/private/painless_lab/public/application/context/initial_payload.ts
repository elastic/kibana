/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { exampleScript, painlessContextOptions } from '../constants';

export const initialPayload = {
  context: painlessContextOptions[0].value,
  code: exampleScript,
  parameters: `{
  "string_parameter": "string value",
  "number_parameter": 1.5,
  "boolean_parameter": true
}`,
  index: 'my-index',
  document: `{
  "my_field": "field_value"
}`,
  query: '',
};

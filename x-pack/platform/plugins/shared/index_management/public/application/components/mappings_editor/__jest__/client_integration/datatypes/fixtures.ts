/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Parameters automatically added to the text datatype when saved (with the default values)
export const defaultTextParameters = {
  type: 'text',
  eager_global_ordinals: false,
  fielddata: false,
  index: true,
  index_options: 'positions',
  index_phrases: false,
  norms: true,
  store: false,
};

// Parameters automatically added to the shape datatype when saved (with the default values)
export const defaultShapeParameters = {
  type: 'shape',
  coerce: false,
  ignore_malformed: false,
  ignore_z_value: true,
};

// Parameters automatically added to the date range datatype when saved (with the default values)
export const defaultDateRangeParameters = {
  type: 'date_range',
  coerce: true,
  index: true,
  store: false,
};

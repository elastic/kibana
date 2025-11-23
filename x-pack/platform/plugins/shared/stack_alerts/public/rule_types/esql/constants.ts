/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DEFAULT_VALUES = {
  TIME_WINDOW_SIZE: 5,
  TIME_WINDOW_UNIT: 'm',
};

export const ESQL_EXPRESSION_ERRORS = {
  esqlQuery: new Array<string>(),
  timeField: new Array<string>(),
  timeWindowSize: new Array<string>(),
  parentId: new Array<string>(),
};

export const ESQL_EXPRESSION_ERROR_KEYS = Object.keys(ESQL_EXPRESSION_ERRORS) as Array<
  keyof typeof ESQL_EXPRESSION_ERRORS
>;

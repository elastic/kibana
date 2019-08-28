/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const DEFAULT_LINES_TO_SAMPLE = 1000;

export const overrideDefaults = {
  timestampFormat: undefined,
  timestampField: undefined,
  format: undefined,
  delimiter: undefined,
  quote: undefined,
  hasHeaderRow: undefined,
  charset: undefined,
  columnNames: undefined,
  shouldTrimFields: undefined,
  grokPattern: undefined,
  linesToSample: undefined,
};

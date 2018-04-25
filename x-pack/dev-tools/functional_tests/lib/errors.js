/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const $isCliError = Symbol('isCliError');

export function createCliError(message) {
  const error = new Error(message);
  error[$isCliError] = true;
  return error;
}

export function isCliError(error) {
  return error && !!error[$isCliError];
}

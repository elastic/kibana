/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const stringifyValueDescription = (value: unknown): string => {
  if (!value) {
    return '';
  }
  if (typeof value === 'object') {
    try {
      // if the value is a json object, it will be stringified as json
      return JSON.stringify(value);
    } catch (e) {
      // ignore any errors
    }
  }
  // otherwise just return a stringified value
  return String(value);
};

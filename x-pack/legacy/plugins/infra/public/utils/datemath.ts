/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import dateMath from '@elastic/datemath';

export function isValidDatemath(value: string): boolean {
  const parsedValue = dateMath.parse(value);
  return !!(parsedValue && parsedValue.isValid());
}

export function datemathToEpochMillis(value: string): number | null {
  const parsedValue = dateMath.parse(value);
  if (!parsedValue || !parsedValue.isValid()) {
    return null;
  }
  return parsedValue.unix() * 1000;
}

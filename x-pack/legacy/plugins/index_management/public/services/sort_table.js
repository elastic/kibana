/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sortBy } from 'lodash';

const stringSort = fieldName => item => item[fieldName];
const numericSort = fieldName => item => +item[fieldName];
const unitMagnitude = {
  kb: 1,
  mb: 2,
  gb: 3,
  tb: 4,
  pb: 5,
};
const byteSort = fieldName => item => {
  const rawValue = item[fieldName];
  // raw value can be missing if index is closed
  if (!rawValue) {
    return 0;
  }
  const matchResult = rawValue.match(/(.*)([kmgtp]b)/);
  if (!matchResult) {
    return 0;
  }
  const [, number, unit] = matchResult;
  return +number * Math.pow(1024, unitMagnitude[unit]);
};

const sorters = {
  name: stringSort('name'),
  status: stringSort('status'),
  health: stringSort('health'),
  primary: numericSort('primary'),
  replica: numericSort('replica'),
  documents: numericSort('documents'),
  size: byteSort('size'),
  primary_size: byteSort('primary_size'),
};
export const sortTable = (array = [], sortField, isSortAscending) => {
  const sorted = sortBy(array, sorters[sortField]);
  return isSortAscending ? sorted : sorted.reverse();
};

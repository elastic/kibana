/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sortBy } from 'lodash';

const stringSort = (fieldName) => (item) => item[fieldName];

const sorters = {};

export const sortTable = (array = [], sortField, isSortAscending) => {
  const sorter = sorters[sortField] || stringSort(sortField);
  const sorted = sortBy(array, sorter);
  return isSortAscending ? sorted : sorted.reverse();
};

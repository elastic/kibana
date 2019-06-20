/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { map, zipObject } from 'lodash';

const isString = val => typeof val === 'string';

export function pivotObjectArray(rows, columns) {
  const columnNames = columns || Object.keys(rows[0]);
  if (!columnNames.every(isString)) {
    throw new Error('Columns should be an array of strings');
  }

  const columnValues = map(columnNames, name => map(rows, name));
  return zipObject(columnNames, columnValues);
}

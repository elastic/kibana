/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { map, zipObject } from 'lodash';

const isString = (val: any): boolean => typeof val === 'string';

export function pivotObjectArray<
  RowType extends { [key: string]: any },
  ReturnColumns extends string = Extract<keyof RowType, string>
>(
  rows: RowType[],
  columns?: string[]
): { [Column in ReturnColumns]: Column extends keyof RowType ? Array<RowType[Column]> : never } {
  const columnNames = columns || Object.keys(rows[0]);
  if (!columnNames.every(isString)) {
    throw new Error('Columns should be an array of strings');
  }

  const columnValues = map(columnNames, name => map(rows, name));
  return zipObject(columnNames, columnValues);
}

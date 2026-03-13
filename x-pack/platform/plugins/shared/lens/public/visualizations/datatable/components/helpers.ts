/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable, DatatableColumnMeta } from '@kbn/expressions-plugin/common';
import memoizeOne from 'memoize-one';

function buildColumnsMetaLookupInner(table: Datatable) {
  return table.columns.reduce<
    Record<string, { name: string; index: number; meta?: DatatableColumnMeta }>
  >((memo, { id, name, meta }, i) => {
    memo[id] = { name, index: i, meta };
    return memo;
  }, {});
}

export function resolveLink(table: Datatable, linkPattern: string, rowIndex: number) {
  let link = linkPattern;
  for (let column of table.columns) {
    const value = table?.rows[rowIndex]?.[column.id];
    link = link.replaceAll(`{{${column.name}}}`, String(value));
  }
  return link;
}

export const buildColumnsMetaLookup = memoizeOne(buildColumnsMetaLookupInner);

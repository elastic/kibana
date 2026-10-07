/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESQL_TABLE_TYPE } from '@kbn/data-plugin/common';
import type { Datatable, DatatableColumnMeta } from '@kbn/expressions-plugin/common';
import { i18n } from '@kbn/i18n';
import memoizeOne from 'memoize-one';

function buildColumnsMetaLookupInner(table: Datatable) {
  return table.columns.reduce<
    Record<
      string,
      { name: string; index: number; meta?: DatatableColumnMeta; isComputedColumn?: boolean }
    >
  >((memo, { id, name, meta, isComputedColumn }, i) => {
    memo[id] = { name, index: i, meta, isComputedColumn };
    return memo;
  }, {});
}

export const buildColumnsMetaLookup = memoizeOne(buildColumnsMetaLookupInner);

export const isEsqlTableComputedColumn = (table: Datatable, columnId: string): boolean => {
  if (!(table.meta?.type === ESQL_TABLE_TYPE)) {
    return false;
  }
  const lookup = buildColumnsMetaLookup(table);
  return Boolean(lookup[columnId]?.isComputedColumn);
};

export const getEsqlComputedColumnFilterDisabledMessage = i18n.translate(
  'xpack.lens.table.tableCellFilter.esqlComputedColumnFilterDrilldownDisabledTooltip',
  {
    defaultMessage:
      "You can't apply a filter or drill down from this value because it relies on a field created at query time.",
  }
);

export const getGenericFilterDisabledMessage = i18n.translate(
  'xpack.lens.table.tableCellFilter.valueFilterDrilldownDisabledTooltip',
  {
    defaultMessage: "You can't apply a filter or drill down from this value.",
  }
);

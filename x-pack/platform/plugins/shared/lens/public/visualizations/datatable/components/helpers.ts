/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable, DatatableColumnMeta } from '@kbn/expressions-plugin/common';
import { ESQL_TABLE_TYPE } from '@kbn/data-plugin/common';
import memoizeOne from 'memoize-one';
import { i18n } from '@kbn/i18n';

function buildColumnsMetaLookupInner(table: Datatable) {
  return table.columns.reduce<
    Record<
      string,
      { name: string; index: number; meta?: DatatableColumnMeta; isComputedColumn?: Boolean }
    >
  >((memo, { id, name, meta, isComputedColumn }, i) => {
    memo[id] = { name, index: i, meta, isComputedColumn };
    return memo;
  }, {});
}

export const buildColumnsMetaLookup = memoizeOne(buildColumnsMetaLookupInner);

/** ES|QL query-time computed columns cannot be phrase-filtered like index fields. */
export const isEsqlQueryTimeComputedColumn = (table: Datatable, columnId: string): boolean => {
  const lookup = buildColumnsMetaLookup(table);
  return table.meta?.type === ESQL_TABLE_TYPE && Boolean(lookup[columnId]?.isComputedColumn);
};

export const getQueryTimeComputedColumnFilterMessage = (
  panelHasConfiguredDrilldowns: boolean = false
) => {
  return panelHasConfiguredDrilldowns
    ? i18n.translate('xpack.lens.datatable.esqlQueryTimeInteraction.shortWithDrilldown', {
        defaultMessage:
          "You can't apply a filter or drill down from this value because it relies on a field created at query time.",
      })
    : i18n.translate('xpack.lens.datatable.esqlQueryTimeInteraction.shortFiltersOnly', {
        defaultMessage:
          "You can't apply a filter from this value because it relies on a field created at query time.",
      });
};

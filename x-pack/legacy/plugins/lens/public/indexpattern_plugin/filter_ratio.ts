/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunction, KibanaDatatable } from 'src/legacy/core_plugins/interpreter/public';

interface FilterRatioKey {
  id: string;
}

export const calculateFilterRatio: ExpressionFunction<
  'lens_calculate_filter_ratio',
  KibanaDatatable,
  FilterRatioKey,
  KibanaDatatable
> = {
  name: 'lens_calculate_filter_ratio',
  type: 'kibana_datatable',
  help: i18n.translate('xpack.lens.functions.calculateFilterRatio.help', {
    defaultMessage: 'A helper to collapse two filter ratio rows into a single row',
  }),
  args: {
    id: {
      types: ['string'],
      help: i18n.translate('xpack.lens.functions.calculateFilterRatio.id.help', {
        defaultMessage: 'The column ID which has the filter ratio',
      }),
    },
  },
  context: {
    types: ['kibana_datatable'],
  },
  fn(data: KibanaDatatable, { id }: FilterRatioKey) {
    const newRows: KibanaDatatable['rows'] = [];

    if (data.rows.length === 0) {
      return data;
    }

    if (data.rows.length % 2 === 1) {
      throw new Error('Cannot divide an odd number of rows');
    }

    const [[valueKey]] = Object.entries(data.rows[0]).filter(([key]) =>
      key.includes('filter-ratio')
    );

    for (let i = 0; i < data.rows.length; i += 2) {
      const row1 = data.rows[i];
      const row2 = data.rows[i + 1];

      const calculatedRatio = row2[valueKey]
        ? (row1[valueKey] as number) / (row2[valueKey] as number)
        : 0;

      const result = { ...row1 };
      delete result[valueKey];

      result[id] = calculatedRatio;

      newRows.push(result);
    }

    const newColumns = data.columns
      .filter(col => !col.id.includes('filter-ratio'))
      .map(col =>
        col.id === id
          ? {
              ...col,
              formatHint: {
                id: 'percent',
              },
            }
          : col
      );

    return {
      type: 'kibana_datatable',
      rows: newRows,
      columns: newColumns,
    };
  },
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/types';
import { KibanaDatatable } from '../types';

interface MergeTables {
  joins: string[];
  tables: KibanaDatatable[];
}

export const mergeTables: ExpressionFunction<
  'lens_merge_tables',
  null,
  MergeTables,
  KibanaDatatable
> = {
  name: 'lens_merge_tables',
  type: 'kibana_datatable',
  help: i18n.translate('xpack.lens.functions.mergeTables.help', {
    defaultMessage: 'A helper to merge any number of kibana tables into a single table',
  }),
  args: {
    joins: {
      types: ['string'],
      help: i18n.translate('xpack.lens.functions.calculateFilterRatio.id.help', {
        defaultMessage: 'The column IDs to join on',
      }),
      multi: true,
    },
    tables: {
      types: ['kibana_datatable'],
      help: '',
      multi: true,
    },
  },
  context: {
    types: ['null'],
  },
  fn(_ctx, { joins, tables }: MergeTables) {
    return {
      type: 'kibana_datatable',
      rows: tables.reduce(
        (prev, current) => prev.concat(current.rows),
        [] as KibanaDatatable['rows']
      ),
      columns: tables.reduce(
        (prev, current) => prev.concat(current.columns),
        [] as KibanaDatatable['columns']
      ),
    };
  },
};

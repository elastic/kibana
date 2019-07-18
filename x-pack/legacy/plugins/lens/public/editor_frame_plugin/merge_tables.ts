/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/types';
import { KibanaDatatable } from '../types';

interface MergeTables {
  layerIds: string[];
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
    layerIds: {
      types: ['string'],
      help: '',
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
  fn(_ctx, { layerIds, tables }: MergeTables) {
    const row: Record<string, KibanaDatatable> = {};

    tables.forEach((table, index) => {
      row[layerIds[index]] = table;
    });
    return {
      type: 'kibana_datatable',
      columns: layerIds.map(layerId => ({
        id: layerId,
        name: '',
      })),
      rows: [row],
    };
  },
};

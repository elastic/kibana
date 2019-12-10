/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import dateMath from '@elastic/datemath';
import { ExpressionFunction, KibanaContext, KibanaDatatable } from 'src/plugins/expressions/public';
import { LensMultiTable } from '../types';

interface MergeTables {
  layerIds: string[];
  tables: KibanaDatatable[];
  _forceNowForTesting?: Date;
}

export const mergeTables: ExpressionFunction<
  'lens_merge_tables',
  KibanaContext | null,
  MergeTables,
  LensMultiTable
> = {
  name: 'lens_merge_tables',
  type: 'lens_multitable',
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
    types: ['kibana_context', 'null'],
  },
  fn(ctx, { layerIds, tables, _forceNowForTesting }: MergeTables) {
    const resultTables: Record<string, KibanaDatatable> = {};
    tables.forEach((table, index) => {
      resultTables[layerIds[index]] = table;
    });
    return {
      type: 'lens_multitable',
      tables: resultTables,
      dateRange: getDateRange(ctx, _forceNowForTesting),
    };
  },
};

function getDateRange(ctx?: KibanaContext | null, now?: Date) {
  if (!ctx || !ctx.timeRange) {
    return;
  }

  // For datemath expressions such as now/d, this gets the upper and lower bound
  const fromDate = dateMath.parse(ctx.timeRange.from, now ? { forceNow: now } : undefined);
  const toDate = dateMath.parse(ctx.timeRange.to, { roundUp: true, forceNow: now || undefined });

  if (!fromDate || !toDate) {
    return;
  }

  return {
    fromDate: fromDate.toDate(),
    toDate: toDate.toDate(),
  };
}

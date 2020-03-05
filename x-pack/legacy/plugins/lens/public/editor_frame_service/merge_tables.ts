/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import {
  ExpressionFunctionDefinition,
  ExpressionValueSearchContext,
  KibanaDatatable,
} from 'src/plugins/expressions/public';
import { LensMultiTable } from '../types';
import { toAbsoluteDates } from '../indexpattern_datasource/auto_date';

interface MergeTables {
  layerIds: string[];
  tables: KibanaDatatable[];
}

export const mergeTables: ExpressionFunctionDefinition<
  'lens_merge_tables',
  ExpressionValueSearchContext | null,
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
  inputTypes: ['kibana_context', 'null'],
  fn(input, { layerIds, tables }) {
    const resultTables: Record<string, KibanaDatatable> = {};
    tables.forEach((table, index) => {
      resultTables[layerIds[index]] = table;
    });
    return {
      type: 'lens_multitable',
      tables: resultTables,
      dateRange: getDateRange(input),
    };
  },
};

function getDateRange(value?: ExpressionValueSearchContext | null) {
  if (!value || !value.timeRange) {
    return;
  }

  const dateRange = toAbsoluteDates({ fromDate: value.timeRange.from, toDate: value.timeRange.to });

  if (!dateRange) {
    return;
  }

  return dateRange;
}

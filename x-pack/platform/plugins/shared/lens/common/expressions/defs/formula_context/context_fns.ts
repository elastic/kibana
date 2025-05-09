/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAbsoluteTimeRange } from '@kbn/data-plugin/common';
import type { TimeRange } from '@kbn/es-query';
import type { Datatable, ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import moment from 'moment';
import { i18n } from '@kbn/i18n';

export type ExpressionFunctionFormulaTimeRange = ExpressionFunctionDefinition<
  'formula_time_range',
  undefined,
  object,
  number
>;

const getTimeRangeAsNumber = (timeRange: TimeRange | undefined, now: number | undefined) => {
  if (!timeRange) return 0;
  const absoluteTimeRange = getAbsoluteTimeRange(
    timeRange,
    now != null ? { forceNow: new Date(now) } : {}
  );
  return timeRange ? moment(absoluteTimeRange.to).diff(moment(absoluteTimeRange.from)) : 0;
};

export const formulaTimeRangeFn: ExpressionFunctionFormulaTimeRange = {
  name: 'formula_time_range',

  help: i18n.translate('xpack.lens.formula.timeRange.help', {
    defaultMessage: 'The specified time range, in milliseconds (ms).',
  }),

  args: {},

  fn(_input, _args, { getSearchContext }) {
    const { timeRange, now } = getSearchContext();
    return getTimeRangeAsNumber(timeRange, now);
  },
};

export type ExpressionFunctionFormulaInterval = ExpressionFunctionDefinition<
  'formula_interval',
  Datatable,
  {
    dateHistogramColumn?: string;
    id: string;
  },
  Datatable
>;

export const formulaIntervalFn: ExpressionFunctionFormulaInterval = {
  name: 'formula_interval',

  help: i18n.translate('xpack.lens.formula.interval.help', {
    defaultMessage: 'The specified minimum interval for the date histogram, in milliseconds (ms).',
  }),

  args: {
    id: {
      types: ['string'],
      help: i18n.translate('xpack.lens.formula.interval.id.help', {
        defaultMessage: 'The id of the resulting column. Must be unique.',
      }),
      required: true,
    },
    dateHistogramColumn: {
      types: ['string'],
      help: i18n.translate('xpack.lens.formula.interval.dateHistogramColumn.help', {
        defaultMessage: 'The date histogram column id to use for the interval calculation.',
      }),
      required: true,
    },
  },

  fn(input, args, { getSearchContext }) {
    const { timeRange, now } = getSearchContext();
    if (timeRange && input?.rows && args.dateHistogramColumn) {
      const endRange = moment(
        getAbsoluteTimeRange(timeRange, now != null ? { forceNow: new Date(now) } : {}).to
      ).valueOf();
      const dateHistogramId = args.dateHistogramColumn;
      return {
        ...input,
        columns: [
          ...input.columns,
          { id: args.id, name: 'Formula interval', meta: { type: 'number' } },
        ],
        rows: input.rows.map((row, i) => {
          const interval =
            (input.rows[i + 1]?.[dateHistogramId!] ?? endRange) - input.rows[i][dateHistogramId!];
          row[args.id] = interval;
          return row;
        }),
      };
    }
    return input;
  },
};

export type ExpressionFunctionFormulaNow = ExpressionFunctionDefinition<
  'formula_now',
  undefined,
  object,
  number
>;

export const formulaNowFn: ExpressionFunctionFormulaNow = {
  name: 'formula_now',

  help: i18n.translate('xpack.lens.formula.now.help', {
    defaultMessage: 'The current now moment used in Kibana expressed in milliseconds (ms).',
  }),

  args: {},

  fn(_input, _args, { getSearchContext }) {
    return getSearchContext().now ?? Date.now();
  },
};

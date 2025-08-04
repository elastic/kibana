/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dateHistogramInterval, getAbsoluteTimeRange, TimeBuckets } from '@kbn/data-plugin/common';
import type { TimeRange } from '@kbn/es-query';
import type { Datatable, ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { parse } from '@kbn/datemath';

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
    targetBars?: number;
    maxBars?: number;
    customInterval?: string;
    dropPartials?: boolean;
    continuousDateHistogram?: boolean;
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
    targetBars: {
      types: ['number'],
      help: i18n.translate('xpack.lens.formula.interval.targetBars.help', {
        defaultMessage: 'The target number of bars for the date histogram.',
      }),
      required: true,
    },
    maxBars: {
      types: ['number'],
      help: i18n.translate('xpack.lens.formula.interval.maxBars.help', {
        defaultMessage: 'The max number of bars for the date histogram.',
      }),
      required: true,
    },
    customInterval: {
      types: ['string'],
      help: i18n.translate('xpack.lens.formula.interval.override.help', {
        defaultMessage: 'The interval override used for the date histogram.',
      }),
    },
    dropPartials: {
      types: ['boolean'],
      help: i18n.translate('xpack.lens.formula.interval.dropPartials.help', {
        defaultMessage:
          'If true, the function will drop partial buckets from the result. Defaults to false.',
      }),
      default: false,
    },
    continuousDateHistogram: {
      types: ['boolean'],
      help: i18n.translate('xpack.lens.formula.interval.continousDateHistogram.help', {
        defaultMessage:
          'If true, the date histogram results are made of sequential buckets. Defaults to false.',
      }),
      default: false,
    },
  },

  fn(input, args, { getSearchContext }) {
    const { timeRange, now } = getSearchContext();
    if (timeRange && input?.rows && args.dateHistogramColumn != null) {
      const newColumns = input.columns.concat({
        id: args.id,
        name: 'Formula interval',
        meta: { type: 'number' },
      });
      // Unfortunately the results of a date histogram does not guarantee that the buckets are sequential,
      // and Lens should forward the "continuousDateHistogram" flag (which is derived from the includeEmptyRows parameter)
      // to know that.
      // Lens Formula context guarantees that even missing count values are not trimmed from the final table.
      // Give the lack of trust on the data itself the following logic is implemented here:
      //   1. there's a custom interval
      //     1.1. the interval is fixed
      //       => use the custom interval
      //       => compute the partial bucket (if enabled) based on the time range
      //     1.2. the interval is calendar
      //       => see solutions for 2.2 or 3.2
      //   2. no sequential buckets are found
      //     2.1. the interval is fixed
      //       => use the data plugin logic to fill the gaps
      //       => compute the partial bucket (if enabled) based on the time range
      //     2.2. the interval is calendar
      //       => use moment logic to fill the gaps?
      //       => what about partial buckets?
      //   3. sequential buckets are found
      //     3.1. the interval is fixed
      //       => use the data plugin logic to fill the gaps (it should be equivalent to the real data)
      //       => compute the partial bucket (if enabled) based on the time range
      //     3.2. the interval is calendar
      //       => compute the interval row by row based on the date histogram column
      //       => compute the partial bucket (if enabled) based on the time range
      const dateHistogramId = args.dateHistogramColumn;

      const timeRangeAsAbsoluteValues = getAbsoluteTimeRange(
        timeRange,
        now != null ? { forceNow: new Date(now) } : {}
      );
      const endRange = moment(timeRangeAsAbsoluteValues.to).valueOf();
      // meanwhile try to understand if it's a fixed or calendar interval
      const buckets = new TimeBuckets({
        'histogram:maxBars': args.maxBars!,
        'histogram:barTarget': args.targetBars!,
        dateFormat: '', // not used here
        'dateFormat:scaled': [], // not used here
      });
      buckets.setBounds({
        min: moment(timeRangeAsAbsoluteValues.from),
        max: moment(timeRangeAsAbsoluteValues.to),
      });
      // set the custom interval is provided
      if (args.customInterval) {
        buckets.setInterval(args.customInterval);
      }
      const dateHistogramIntervalValue = dateHistogramInterval(buckets.getInterval().expression);
      const isCalendarInterval = 'calendar_interval' in dateHistogramIntervalValue;

      // case 1
      if (args.customInterval) {
        // case 1.1
        const intervalInMs = buckets.getInterval().valueOf();
        return {
          ...input,
          columns: newColumns,
          rows: input.rows.map((row, i) => {
            const isLastBucket = i === input.rows.length - 1;
            if (isLastBucket) {
              if (!args.dropPartials) {
                const bucketsBounds = buckets.getBounds();
                const timeRangeAsDuration = bucketsBounds!.max?.diff(bucketsBounds!.min);
                const interval = timeRangeAsDuration! % buckets.getInterval().asMilliseconds();
                row[args.id] = interval;
              } else {
                row[args.id] = intervalInMs;
              }
            } else {
              row[args.id] = intervalInMs;
            }
            return row;
          }),
        };
      }
      // case 2
      if (!args.continuousDateHistogram) {
        // case 2.1
        if (!isCalendarInterval) {
          const intervalInMs = buckets.getInterval().valueOf();
          return {
            ...input,
            columns: newColumns,
            rows: input.rows.map((row) => {
              row[args.id] = intervalInMs;
              return row;
            }),
          };
        } else {
          // case 2.2
          // use dateMath to parse the generated calendar interval and
          const interval = parse(dateHistogramIntervalValue.calendar_interval, {
            momentInstance: moment,
          });
          // ok so this is tricky as moment won't tell how long is a calendar interval based on the context
          // - i.e. a month is 30 days by default in moment.
          // So how to compute the interval?
          // Start with a bucket and compute the the interval based on what?
          // TODO: this is not implemented yet
          return {
            ...input,
            columns: newColumns,
            rows: input.rows.map((row) => {
              row[args.id] = interval?.valueOf() ?? 0;
              return row;
            }),
          };
        }
      }
      // case 3
      return {
        ...input,
        columns: newColumns,
        rows: input.rows.map((row, i) => {
          // compute until the row-1 entry
          if (i < input.rows.length - 1) {
            let interval = input.rows[i + 1]?.[dateHistogramId!] - row[dateHistogramId!];
            if (Number.isNaN(interval)) {
              if (!isCalendarInterval) {
                // case 3.1
                // use the data plugin logic to fill the gap
                interval = buckets.getInterval().asMilliseconds();
              } else {
                // case 3.2
                // use moment logic to fill the gap
              }
            }
            row[args.id] = interval;
            return row;
          }
          // case 3
          if (!args.dropPartials) {
            // case 3
            const bucketsBounds = buckets.getBounds();
            const timeRangeAsDuration = bucketsBounds!.max?.diff(bucketsBounds!.min);
            const interval = timeRangeAsDuration! % buckets.getInterval().asMilliseconds();
            row[args.id] = interval;
          } else {
            // use the data plugin logic to fill the gap
            const interval = endRange - row[dateHistogramId!];
            row[args.id] = interval;
          }
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

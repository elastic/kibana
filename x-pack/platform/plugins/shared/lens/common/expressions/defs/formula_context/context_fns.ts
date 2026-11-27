/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_HISTOGRAM_BAR_TARGET, getAbsoluteTimeRange } from '@kbn/data-plugin/common';
import { ianaTimeZoneOrUtc, pickDateRounding } from '@kbn/es-date-rounding';
import type { TimeRange } from '@kbn/es-query';
import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
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
  undefined,
  {
    targetBars?: number;
    timeZone?: string;
  },
  number
>;

export const formulaIntervalFn: ExpressionFunctionFormulaInterval = {
  name: 'formula_interval',

  help: i18n.translate('xpack.lens.formula.interval.help', {
    defaultMessage: 'The specified minimum interval for the date histogram, in milliseconds (ms).',
  }),

  args: {
    targetBars: {
      types: ['number'],
      help: i18n.translate('xpack.lens.formula.interval.targetBars.help', {
        defaultMessage: 'The target number of bars for the date histogram.',
      }),
    },
    timeZone: {
      types: ['string'],
      help: i18n.translate('xpack.lens.formula.interval.timeZone.help', {
        defaultMessage:
          'The time zone of the date histogram. Uses UTC when it is missing or not valid.',
      }),
    },
  },

  fn(_input, args, { getSearchContext }) {
    const { timeRange, now } = getSearchContext();
    if (!timeRange || !args.targetBars) {
      return 0;
    }
    const absoluteTimeRange = getAbsoluteTimeRange(
      timeRange,
      now != null ? { forceNow: new Date(now) } : {}
    );
    const from = moment(absoluteTimeRange.from).valueOf();
    const to = moment(absoluteTimeRange.to).valueOf();
    if (!Number.isFinite(from) || !Number.isFinite(to) || from >= to) {
      return 0;
    }
    // Same normalization as the date histogram (`getAutoDateBucketTarget`), so a decimal or invalid
    // setting cannot make the picker throw.
    const { targetBars: requestedBars } = args;
    const targetBars =
      Number.isInteger(requestedBars) && requestedBars > 0
        ? requestedBars
        : DEFAULT_HISTOGRAM_BAR_TARGET;
    return pickDateRounding(targetBars, {
      from,
      to,
      timeZone: ianaTimeZoneOrUtc(args.timeZone),
    }).nominalMs;
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

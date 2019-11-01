/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TimeBuckets } from 'ui/time_buckets';
import dateMath from '@elastic/datemath';
import {
  ExpressionFunction,
  KibanaContext,
} from '../../../../../../src/plugins/expressions/common';
import { DateRange } from '../../common';

interface LensAutoDateProps {
  aggConfigs: string;
}

export function autoIntervalFromDateRange(dateRange?: DateRange, defaultValue: string = '1h') {
  if (!dateRange) {
    return defaultValue;
  }

  const buckets = new TimeBuckets();
  buckets.setInterval('auto');
  buckets.setBounds({
    min: dateMath.parse(dateRange.fromDate),
    max: dateMath.parse(dateRange.toDate, { roundUp: true }),
  });

  return buckets.getInterval().expression;
}

function autoIntervalFromContext(ctx?: KibanaContext | null) {
  if (!ctx || !ctx.timeRange) {
    return;
  }

  const { timeRange } = ctx;

  return autoIntervalFromDateRange({
    fromDate: timeRange.from,
    toDate: timeRange.to,
  });
}

/**
 * Convert all 'auto' date histograms into a concrete value (e.g. 2h).
 * This allows us to support 'auto' on all date fields, and opens the
 * door to future customizations (e.g. adjusting the level of detail, etc).
 */
export const autoDate: ExpressionFunction<
  'lens_auto_date',
  KibanaContext | null,
  LensAutoDateProps,
  string
> = {
  name: 'lens_auto_date',
  aliases: [],
  help: '',
  context: {
    types: ['kibana_context', 'null'],
  },
  args: {
    aggConfigs: {
      types: ['string'],
      default: '""',
      help: '',
    },
  },
  fn(ctx: KibanaContext, args: LensAutoDateProps) {
    const interval = autoIntervalFromContext(ctx);

    if (!interval) {
      return args.aggConfigs;
    }

    const configs = JSON.parse(args.aggConfigs) as Array<{
      type: string;
      params: { interval: string };
    }>;

    const updatedConfigs = configs.map(c => {
      if (c.type !== 'date_histogram' || !c.params || c.params.interval !== 'auto') {
        return c;
      }

      return {
        ...c,
        params: {
          ...c.params,
          interval,
        },
      };
    });

    return JSON.stringify(updatedConfigs);
  },
};

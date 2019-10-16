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

interface LensAutoDateProps {
  aggConfigs: string;
}

export function getAutoInterval(ctx?: KibanaContext | null) {
  if (!ctx || !ctx.timeRange) {
    return;
  }

  const { timeRange } = ctx;
  const buckets = new TimeBuckets();
  buckets.setInterval('auto');
  buckets.setBounds({
    min: dateMath.parse(timeRange.from),
    max: dateMath.parse(timeRange.to, { roundUp: true }),
  });

  return buckets.getInterval();
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
    const interval = getAutoInterval(ctx);

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
          interval: interval.expression,
        },
      };
    });

    return JSON.stringify(updatedConfigs);
  },
};

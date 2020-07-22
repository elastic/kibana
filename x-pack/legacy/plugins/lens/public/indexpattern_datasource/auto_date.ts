/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DataPublicPluginSetup } from '../../../../../../src/plugins/data/public';
import {
  ExpressionFunctionDefinition,
  KibanaContext,
} from '../../../../../../src/plugins/expressions/public';

interface LensAutoDateProps {
  aggConfigs: string;
}

export function getAutoDate(deps: {
  data: DataPublicPluginSetup;
}): ExpressionFunctionDefinition<
  'lens_auto_date',
  KibanaContext | null,
  LensAutoDateProps,
  string
> {
  function autoIntervalFromContext(ctx?: KibanaContext | null) {
    if (!ctx || !ctx.timeRange) {
      return;
    }

    return deps.data.search.aggs.calculateAutoTimeExpression(ctx.timeRange);
  }

  /**
   * Convert all 'auto' date histograms into a concrete value (e.g. 2h).
   * This allows us to support 'auto' on all date fields, and opens the
   * door to future customizations (e.g. adjusting the level of detail, etc).
   */
  return {
    name: 'lens_auto_date',
    aliases: [],
    help: '',
    inputTypes: ['kibana_context', 'null'],
    args: {
      aggConfigs: {
        types: ['string'],
        default: '""',
        help: '',
      },
    },
    fn(input, args) {
      const interval = autoIntervalFromContext(input);

      if (!interval) {
        return args.aggConfigs;
      }

      const configs = JSON.parse(args.aggConfigs) as Array<{
        type: string;
        params: { interval: string };
      }>;

      const updatedConfigs = configs.map((c) => {
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
}

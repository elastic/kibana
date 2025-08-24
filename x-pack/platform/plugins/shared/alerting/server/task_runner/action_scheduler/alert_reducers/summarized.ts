/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type AlertInstanceState as State,
  type AlertInstanceContext as Context,
  type RuleTypeParams,
} from '../../../types';
import type { AlertReducerFn, ReducerOpts } from '.';

export const reduceSummarized: AlertReducerFn = async <
  P extends RuleTypeParams,
  S extends State,
  C extends Context,
  G extends string,
  R extends string
>(
  opts: ReducerOpts<P, S, C, G, R>
) => {
  const logger = opts.context.logger.get('reduceSummarized');
  logger.info(`Filtering alerts that do not exist in the alert summary for this action`);

  if (!opts.context.action) {
    // If there is no action, we cannot filter alerts based on pending recovery.
    return opts.alerts;
  }

  return opts.alerts.filter(({ alert }) => {
    if (alert.isFilteredOut(opts.context.action?.summarizedAlerts ?? null)) {
      return false;
    }
    return true;
  });
};

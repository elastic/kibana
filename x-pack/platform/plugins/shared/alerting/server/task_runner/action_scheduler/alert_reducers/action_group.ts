/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertCategory } from '../../../alerts_client/types';
import {
  type AlertInstanceState as State,
  type AlertInstanceContext as Context,
  type RuleTypeParams,
} from '../../../types';
import type { AlertReducerFn, ReducerOpts } from '.';

export const reduceActionGroup: AlertReducerFn = async <
  P extends RuleTypeParams,
  S extends State,
  C extends Context,
  G extends string,
  R extends string
>(
  opts: ReducerOpts<P, S, C, G, R>
) => {
  const logger = opts.context.logger.get('reduceActionGroup');
  logger.info(`Filtering alerts that do not match the action group for this action`);

  if (!opts.context.action) {
    // If there is no action, we cannot filter alerts based on action group
    return opts.alerts;
  }

  return opts.alerts.filter(({ alert, category }) => {
    if (category === AlertCategory.New || category === AlertCategory.Ongoing) {
      const alertsActionGroup = alert.getScheduledActionOptions()?.actionGroup;
      if (opts.context.action?.group !== alertsActionGroup) {
        return false;
      }
    } else if (category === AlertCategory.Recovered) {
      if (opts.context.action?.group !== opts.context.ruleType.recoveryActionGroup.id) {
        return false;
      }
    }
    return true;
  });
};

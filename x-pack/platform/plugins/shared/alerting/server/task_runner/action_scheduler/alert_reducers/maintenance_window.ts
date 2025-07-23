/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AlertInstanceState as State,
  AlertInstanceContext as Context,
  RuleTypeParams,
} from '../../../types';
import type { AlertReducerFn, ReducerOpts } from '.';

export const reduceActiveMaintenanceWindow: AlertReducerFn = async <
  P extends RuleTypeParams,
  S extends State,
  C extends Context,
  G extends string,
  R extends string
>(
  opts: ReducerOpts<P, S, C, G, R>
) => {
  const logger = opts.context.logger.get('reduceActiveMaintenanceWindow');
  logger.info(`Filtering alerts where alert has active maintenance window`);

  return opts.alerts.filter(({ alert }) => {
    const alertMaintenanceWindowIds = alert.getMaintenanceWindowIds();
    if (alertMaintenanceWindowIds.length > 0) {
      logger.debug(
        `skipping scheduling of actions for '${alert.getId()}' in rule ${
          opts.context.rule.id
        }: alert is under active maintenance windows: ${alertMaintenanceWindowIds.join(', ')}`
      );
      return false;
    }

    return true;
  });
};

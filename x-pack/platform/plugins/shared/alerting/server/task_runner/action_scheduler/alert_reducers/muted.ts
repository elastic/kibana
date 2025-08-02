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

export const reduceMuted: AlertReducerFn = async <
  P extends RuleTypeParams,
  S extends State,
  C extends Context,
  G extends string,
  R extends string
>(
  opts: ReducerOpts<P, S, C, G, R>
) => {
  const logger = opts.context.logger.get('reduceMuted');
  logger.info(`Filtering alerts where alert is muted`);

  const mutedAlertIdsSet = new Set(opts.context.rule.mutedInstanceIds);

  return opts.alerts.filter(({ alert }) => {
    const alertId = alert.getId();
    const isMuted = mutedAlertIdsSet.has(alertId);
    if (isMuted) {
      logger.debug(
        `skipping scheduling of actions for '${alertId}' in rule ${opts.context.rule.id}: alert is muted`
      );
    }
    return !isMuted;
  });
};

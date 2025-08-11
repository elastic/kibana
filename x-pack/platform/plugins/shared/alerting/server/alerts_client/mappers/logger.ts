/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertCategory, filterFor, type AlertMapperFn, type MapperOpts } from './types';
import type { AlertInstanceState as State, AlertInstanceContext as Context } from '../../types';

export const applyLogger: AlertMapperFn = async <
  S extends State,
  C extends Context,
  G extends string,
  R extends string
>(
  opts: MapperOpts<S, C, G, R>
) => {
  const logger = opts.context.alertsClientContext.logger.get('applyLogger');
  logger.info(`Applying logger mapping function`);

  if (opts.context.alertsClientContext.logger.isLevelEnabled('debug')) {
    const newAlerts = filterFor(opts.alerts, AlertCategory.New).map(({ alert }) => ({
      instanceId: alert.getId(),
      actionGroup: alert.getScheduledActionOptions()?.actionGroup,
    }));
    const ongoingAlerts = filterFor(opts.alerts, AlertCategory.Ongoing).map(({ alert }) => ({
      instanceId: alert.getId(),
      actionGroup: alert.getScheduledActionOptions()?.actionGroup,
    }));
    const recoveredAlerts = filterFor(opts.alerts, AlertCategory.Recovered);

    const newAndActive = newAlerts.length + ongoingAlerts.length;
    if (newAndActive > 0) {
      opts.context.alertsClientContext.logger.debug(
        `rule ${opts.context.ruleLogPrefix} has ${newAndActive} active alerts: ${JSON.stringify([
          ...newAlerts,
          ...ongoingAlerts,
        ])}`
      );
    }

    if (recoveredAlerts.length > 0) {
      opts.context.alertsClientContext.logger.debug(
        `rule ${opts.context.ruleLogPrefix} has ${
          recoveredAlerts.length
        } recovered alerts: ${JSON.stringify(recoveredAlerts.map(({ alert }) => alert.getId()))}`
      );

      if (opts.context.alertsClientContext.ruleType.doesSetRecoveryContext) {
        recoveredAlerts.forEach(({ alert }) => {
          if (!alert.hasContext()) {
            opts.context.alertsClientContext.logger.debug(
              `rule ${
                opts.context.ruleLogPrefix
              } has no recovery context specified for recovered alert ${alert.getId()}`
            );
          }
        });
      }
    }
  }

  return opts.alerts;
};

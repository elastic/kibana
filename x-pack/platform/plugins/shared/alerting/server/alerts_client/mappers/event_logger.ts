/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertCategory, type AlertMapperFn, type MapperOpts } from './types';
import type { AlertInstanceState as State, AlertInstanceContext as Context } from '../../types';
import { EVENT_LOG_ACTIONS } from '../../plugin';

export const applyEventLogger: AlertMapperFn = async <
  S extends State,
  C extends Context,
  G extends string,
  R extends string
>(
  opts: MapperOpts<S, C, G, R>
) => {
  const logger = opts.context.alertsClientContext.logger.get('applyEventLogger');
  logger.info(`Applying event logger mapping function`);

  if (opts.context.shouldLogAlerts) {
    opts.alerts.forEach(({ alert, category }) => {
      const id = alert.getId();
      const uuid = alert.getUuid();
      const state = alert.getState();
      const flapping = alert.getFlapping();
      const maintenanceWindowIds = alert.getMaintenanceWindowIds();

      if (category === AlertCategory.New) {
        const { actionGroup } = alert.getScheduledActionOptions() ?? {};
        const message = `${opts.context.ruleLogPrefix} created new alert: '${id}'`;
        opts.context.alertsClientContext.alertingEventLogger.logAlert({
          action: EVENT_LOG_ACTIONS.newInstance,
          id,
          uuid,
          group: actionGroup,
          message,
          state,
          flapping,
          ...(maintenanceWindowIds.length ? { maintenanceWindowIds } : {}),
        });
      } else if (category === AlertCategory.Ongoing) {
        const { actionGroup } = alert.getScheduledActionOptions() ?? {};
        const message = `${opts.context.ruleLogPrefix} active alert: '${id}' in actionGroup: '${actionGroup}'`;

        opts.context.alertsClientContext.alertingEventLogger.logAlert({
          action: EVENT_LOG_ACTIONS.activeInstance,
          id,
          uuid,
          group: actionGroup,
          message,
          state,
          flapping,
          ...(maintenanceWindowIds.length ? { maintenanceWindowIds } : {}),
        });
      } else if (category === AlertCategory.Recovered) {
        const { group: actionGroup } = alert.getLastScheduledActions() ?? {};
        const message = `${opts.context.ruleLogPrefix} alert '${alert.getId()}' has recovered`;
        opts.context.alertsClientContext.alertingEventLogger.logAlert({
          action: EVENT_LOG_ACTIONS.recoveredInstance,
          id,
          uuid,
          group: actionGroup,
          message,
          state,
          flapping,
          ...(maintenanceWindowIds.length ? { maintenanceWindowIds } : {}),
        });
      }
    });
  }

  return opts.alerts;
};

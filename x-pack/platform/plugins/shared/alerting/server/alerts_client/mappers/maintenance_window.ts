/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertCategory, type AlertMapperFn } from '../alert_mapper';
import type { AlertInstanceState as State, AlertInstanceContext as Context } from '../../types';
import type { MapperOpts } from '../alert_mapper';

export const applyMaintenanceWindows: AlertMapperFn = async <
  S extends State,
  C extends Context,
  G extends string,
  R extends string
>(
  opts: MapperOpts<S, C, G, R>
) => {
  const logger = opts.context.alertsClientContext.logger.get('applyMaintenanceWindows');
  logger.info(`Applying maintenance window mapping function`);

  if (!opts.context.alertsClientContext.maintenanceWindowsService || !opts.alerts.length) {
    logger.info(`No maintenance windows service or no alerts, passing through alerts as is`);
    return opts.alerts;
  }

  logger.info(`Loading maintenance windows for alerts`);
  // load maintenance windows if there are any any alerts (new, active, recovered)
  // this is because we need the MW IDs for any active or recovered alerts that may
  // have started during the MW period.
  const { maintenanceWindowsWithoutScopedQueryIds, maintenanceWindows } =
    await opts.context.alertsClientContext.maintenanceWindowsService.getMaintenanceWindows({
      eventLogger: opts.context.alertsClientContext.alertingEventLogger,
      request: opts.context.alertsClientContext.request,
      ruleTypeCategory: opts.context.alertsClientContext.ruleType.category,
      spaceId: opts.context.alertsClientContext.spaceId,
    });

  const maintenanceWindowIds = maintenanceWindows.map((mw) => mw.id);

  return opts.alerts.map(({ alert, category }) => {
    if (category === AlertCategory.Ongoing || category === AlertCategory.Recovered) {
      // clear outdated maintenance windows from ongoing and recovered alerts
      const existingMaintenanceWindowIds = alert.getMaintenanceWindowIds();
      const activeMaintenanceWindowIds = existingMaintenanceWindowIds.filter((mw) => {
        return maintenanceWindowIds.includes(mw);
      });
      alert.setMaintenanceWindowIds(activeMaintenanceWindowIds);
    } else if (category === AlertCategory.New) {
      // add active maintenance windows to new alerts
      alert.setMaintenanceWindowIds(maintenanceWindowsWithoutScopedQueryIds);
    }

    return { alert, category };
  });
};

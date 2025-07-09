/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertInstanceContext, AlertInstanceState } from '../../types';
import { AlertCategory, type AlertsResult, type MapperOpts } from '../types';

export async function mapMaintenanceWindows<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
>(
  opts: MapperOpts<State, Context, ActionGroupIds, RecoveryActionGroupId>
): Promise<AlertsResult<State, Context, ActionGroupIds, RecoveryActionGroupId>> {
  console.log(`mapMaintenanceWindows called`);
  return opts.alerts;
  // if (!opts.context.alertsClientContext.maintenanceWindowsService || !opts.alerts.length) {
  //   return opts.alerts;
  // }

  // // load maintenance windows if there are any any alerts (new, active, recovered)
  // // this is because we need the MW IDs for any active or recovered alerts that may
  // // have started during the MW period.

  // const { maintenanceWindowsWithoutScopedQueryIds, maintenanceWindows } =
  //   await opts.context.alertsClientContext.maintenanceWindowsService.getMaintenanceWindows({
  //     eventLogger: opts.context.alertsClientContext.alertingEventLogger,
  //     request: opts.context.alertsClientContext.request,
  //     ruleTypeCategory: opts.context.alertsClientContext.ruleType.category,
  //     spaceId: opts.context.alertsClientContext.spaceId,
  //   });

  // const maintenanceWindowIds = maintenanceWindows.map((mw) => mw.id);

  // // clear maintenance windows from ongoing and recovered alerts
  // return opts.alerts.map(({ alert, category }) => {
  //   if (category === AlertCategory.Ongoing || category === AlertCategory.Recovered) {
  //     const existingMaintenanceWindowIds = alert.getMaintenanceWindowIds();
  //     const activeMaintenanceWindowIds = existingMaintenanceWindowIds.filter((mw) => {
  //       return maintenanceWindowIds.includes(mw);
  //     });
  //     alert.setMaintenanceWindowIds(activeMaintenanceWindowIds);
  //   } else if (category === AlertCategory.New) {
  //     alert.setMaintenanceWindowIds(maintenanceWindowsWithoutScopedQueryIds);
  //   }

  //   return { alert, category };
  // });
}

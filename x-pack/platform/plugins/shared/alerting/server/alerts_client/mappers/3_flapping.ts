/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact } from 'lodash';
import { isAlertFlapping } from '../../lib/flapping/set_flapping';
import type { AlertInstanceContext, AlertInstanceState } from '../../types';
import { AlertCategory, type AlertsResult, type MapperOpts } from '../types';
import { updateAlertFlappingHistory } from '../../lib/flapping/set_flapping_history_and_tracked_alerts';

export async function mapFlapping<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
>(
  opts: MapperOpts<State, Context, ActionGroupIds, RecoveryActionGroupId>
): Promise<AlertsResult<State, Context, ActionGroupIds, RecoveryActionGroupId>> {
  console.log(`mapFlapping called`);
  return opts.alerts;
  // if (!opts.context.flappingSettings.enabled) {
  //   return opts.alerts;
  // }

  // const previouslyRecoveredAlerts = opts.alerts.filter(
  //   ({ category }) => category === AlertCategory.PreviouslyRecovered
  // );
  // const previouslyRecoveredAlertIds = new Set(
  //   previouslyRecoveredAlerts.map(({ alert }) => alert.getId())
  // );

  // const getPreviouslyRecoveredFlappingHistory = (id: string) => {
  //   return (
  //     previouslyRecoveredAlerts
  //       .find(({ alert }) => alert.getId() === id)
  //       ?.alert.getFlappingHistory() || []
  //   );
  // };

  // return compact(
  //   opts.alerts
  //     .map((alert) => {
  //       // determine if the alert is flapping
  //       const flapping = isAlertFlapping(opts.context.flappingSettings, alert.alert);
  //       alert.alert.setFlapping(flapping);

  //       return alert;
  //     })
  //     .map(({ alert, category }) => {
  //       let omitAlert: boolean = false;
  //       if (category === AlertCategory.New) {
  //         const id = alert.getId();
  //         if (previouslyRecoveredAlertIds.has(id)) {
  //           // this alert has flapped from recovered to active; copy over the flapping history
  //           alert.setFlappingHistory(getPreviouslyRecoveredFlappingHistory(id));
  //           previouslyRecoveredAlertIds.delete(id);
  //         }

  //         updateAlertFlappingHistory(opts.context.flappingSettings, alert, true);
  //       } else if (category === AlertCategory.Ongoing) {
  //         // alert is still active
  //         updateAlertFlappingHistory(opts.context.flappingSettings, alert, false);
  //       } else if (category === AlertCategory.Recovered) {
  //         // alert has flapped from active to recovered
  //         updateAlertFlappingHistory(opts.context.flappingSettings, alert, true);
  //       } else if (category === AlertCategory.PreviouslyRecovered) {
  //         // check that id is still in the previously recovered set
  //         if (previouslyRecoveredAlertIds.has(alert.getId())) {
  //           updateAlertFlappingHistory(opts.context.flappingSettings, alert, false);
  //         } else {
  //           omitAlert = true;
  //         }
  //       }

  //       return omitAlert ? null : { alert, category };
  //     })
  // );
}

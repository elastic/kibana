/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact } from 'lodash';
import type { AlertInstanceContext, AlertInstanceState } from '../../types';
import { AlertCategory, type AlertsResult, type MapperOpts } from '../types';

export async function mapAlertDelay<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
>(
  opts: MapperOpts<State, Context, ActionGroupIds, RecoveryActionGroupId>
): Promise<AlertsResult<State, Context, ActionGroupIds, RecoveryActionGroupId>> {
  console.log(`mapAlertDelay called`);
  return opts.alerts;
  // const currentTime = opts.context.startedAt ?? new Date().toISOString();
  // let delayedAlertsCount = 0;
  // const mappedAlerts = compact(
  //   opts.alerts.map(({ alert, category }) => {
  //     let omitAlert: boolean = false;
  //     let updatedCategory: AlertCategory = category;
  //     if (category === AlertCategory.New || category === AlertCategory.Ongoing) {
  //       alert.incrementActiveCount();

  //       // do not trigger an action notification if the number of consecutive
  //       // active alerts is less than the rule alertDelay threshold
  //       if (alert.getActiveCount() < opts.context.alertDelay) {
  //         omitAlert = true;
  //         delayedAlertsCount += 1;
  //       } else {
  //         // if the active count is equal to the alertDelay it is considered a new alert
  //         if (alert.getActiveCount() === opts.context.alertDelay) {
  //           const state = alert.getState();
  //           // keep the state and update the start time and duration
  //           alert.replaceState({ ...state, start: currentTime, duration: '0' });
  //           updatedCategory = AlertCategory.New;
  //         }
  //       }
  //     } else if (category === AlertCategory.Recovered) {
  //       // if alert has not reached the alertDelay threshold don't recover the alert
  //       if (alert.getActiveCount() < opts.context.alertDelay) {
  //         omitAlert = true;
  //       }
  //       alert.resetActiveCount();
  //     }

  //     return omitAlert ? null : { alert, category: updatedCategory };
  //   })
  // );

  // return mappedAlerts;
}

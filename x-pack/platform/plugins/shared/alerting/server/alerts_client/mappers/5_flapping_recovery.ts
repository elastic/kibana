/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Alert } from '../../alert/alert';
import type { MapperOpts } from '../alert_mapper';
import { type AlertMapperFn, AlertCategory } from '../alert_mapper';
import type { AlertInstanceState as State, AlertInstanceContext as Context } from '../../types';

export const applyFlappingRecovery: AlertMapperFn = async <
  S extends State,
  C extends Context,
  G extends string,
  R extends string
>(
  opts: MapperOpts<S, C, G, R>
) => {
  opts.context.alertsClientContext.logger.info(
    `Applying flapping delayed recovery mapping function`
  );

  // TO CHECK - should we skip this if flapping is disabled?

  return opts.alerts.map(({ alert, category }) => {
    if (category === AlertCategory.New || category === AlertCategory.Ongoing) {
      // reset pending recovered count for new and ongoing alerts
      alert.resetPendingRecoveredCount();
    } else if (category === AlertCategory.Recovered) {
      const isFlapping = alert.getFlapping();
      if (isFlapping) {
        alert.incrementPendingRecoveredCount();
        if (
          alert.getPendingRecoveredCount() < opts.context.flappingSettings.statusChangeThreshold
        ) {
          // keep the context and previous actionGroupId if available
          const context = alert.getContext();
          const lastActionGroupId: G | undefined = alert.getLastScheduledActions()?.group as G;

          const newAlert = new Alert<S, C, G>(alert.getId(), alert.toRaw());
          // unset the end time in the alert state
          const state = newAlert.getState();
          delete state.end;
          newAlert.replaceState(state);

          // schedule actions for the new active alert
          newAlert.scheduleActions(
            lastActionGroupId
              ? lastActionGroupId
              : (opts.context.alertsClientContext.ruleType.defaultActionGroupId as never),
            context
          );

          return { alert: newAlert, category: AlertCategory.Ongoing };
        } else {
          alert.resetPendingRecoveredCount();
        }
      }

      return { alert, category };
    }

    return { alert, category };
  });
};

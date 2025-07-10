/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep, compact } from 'lodash';
import type { Alert } from '../../alert/alert';
import { updateAlertFlappingHistory } from '../../lib/flapping/update_alert_flapping_history';
import { AlertCategory, filterFor, type AlertMapperFn } from '../alert_mapper';
import type { AlertInstanceState as State, AlertInstanceContext as Context } from '../../types';
import type { MapperOpts } from '../alert_mapper';

export const applyFlappingHistory: AlertMapperFn = async <
  S extends State,
  C extends Context,
  G extends string,
  R extends string
>(
  opts: MapperOpts<S, C, G, R>
) => {
  const logger = opts.context.alertsClientContext.logger.get('applyFlappingHistory');
  logger.info(`Applying flapping history mapping function`);

  const previouslyRecoveredAlerts: Map<string, Alert<S, C, G>> = opts.context
    .previousRecoveredAlerts
    ? cloneDeep(opts.context.previousRecoveredAlerts)
    : new Map();

  const previouslyRecoveredAlertIds = new Set(previouslyRecoveredAlerts.keys());
  const newAlerts = filterFor(opts.alerts, AlertCategory.New);
  const ongoingAlerts = filterFor(opts.alerts, AlertCategory.Ongoing);
  const recoveredAlerts = filterFor(opts.alerts, AlertCategory.Recovered);

  const getPreviouslyRecoveredFlappingHistory = (id: string) => {
    const previouslyRecoveredAlert = previouslyRecoveredAlerts.get(id);
    return previouslyRecoveredAlert ? previouslyRecoveredAlert.getFlappingHistory() : [];
  };

  return compact([
    ...newAlerts.map(({ alert, category }) => {
      const id = alert.getId();
      if (previouslyRecoveredAlertIds.has(id)) {
        // this alert has flapped from recovered to active; copy over the flapping history
        alert.setFlappingHistory(getPreviouslyRecoveredFlappingHistory(id));
        previouslyRecoveredAlertIds.delete(id);
      }
      updateAlertFlappingHistory(opts.context.flappingSettings, alert, true);

      return { alert, category };
    }),
    ...ongoingAlerts.map(({ alert, category }) => {
      // alert is still active
      updateAlertFlappingHistory(opts.context.flappingSettings, alert, false);
      return { alert, category };
    }),
    ...recoveredAlerts.map(({ alert, category }) => {
      // alert has flapped from active to recovered
      updateAlertFlappingHistory(opts.context.flappingSettings, alert, true);
      return { alert, category };
    }),
    ...[...previouslyRecoveredAlertIds].map((id) => {
      const alert: Alert<S, C, G> | undefined = previouslyRecoveredAlerts.get(id);
      if (alert) {
        // alert is still recovered; we track these for a certain number of runs for flapping purposes
        updateAlertFlappingHistory(opts.context.flappingSettings, alert, false);
        return { alert, category: AlertCategory.OngoingRecovered };
      }
    }),
  ]);
};

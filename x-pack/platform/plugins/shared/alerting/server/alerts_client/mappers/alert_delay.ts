/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact } from 'lodash';
import type { AlertInstanceState as State, AlertInstanceContext as Context } from '../../types';
import type { MapperOpts } from '../alert_mapper';
import { AlertCategory, type AlertMapperFn } from '../alert_mapper';

export const applyAlertDelay: AlertMapperFn = async <
  S extends State,
  C extends Context,
  G extends string,
  R extends string
>(
  opts: MapperOpts<S, C, G, R>
) => {
  const logger = opts.context.alertsClientContext.logger.get('applyAlertDelay');
  logger.info(`Applying alert delay mapping function`);

  // TODO ruleRunMetricsStore
  return compact(
    opts.alerts.map(({ alert, category }) => {
      if (category === AlertCategory.Ongoing || category === AlertCategory.New) {
        alert.incrementActiveCount();

        // do not trigger an action notification if the number of consecutive
        // active alerts is less than the rule alertDelay threshold
        if (alert.getActiveCount() < opts.context.alertDelay) {
          // remove alert
          return null;
        } else {
          // if the active count is equal to the alertDelay it is considered a new alert
          if (alert.getActiveCount() === opts.context.alertDelay) {
            // keep the state and update the start time and duration
            alert.setStart(opts.context.startedAt);

            // recategorize as a new alert
            return { alert, category: AlertCategory.New };
          }
        }
      } else if (category === AlertCategory.Recovered) {
        // if alert has not reached the alertDelay threshold don't recover the alert
        if (alert.getActiveCount() < opts.context.alertDelay) {
          // remove alert
          return null;
        }
        alert.resetActiveCount();
      }

      return { alert, category };
    })
  );
};

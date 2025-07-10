/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import type { AlertInstanceState as State, AlertInstanceContext as Context } from '../../types';
import type { MapperOpts } from '../alert_mapper';
import { AlertCategory, filterFor, type AlertMapperFn } from '../alert_mapper';

export const applyAlertLimit: AlertMapperFn = async <
  S extends State,
  C extends Context,
  G extends string,
  R extends string
>(
  opts: MapperOpts<S, C, G, R>
) => {
  opts.context.alertsClientContext.logger.info(`Applying alert limit mapping function`);
  if (!opts.context.hasReachedAlertLimit) {
    return opts.alerts;
  }

  // When the alert limit has been reached,
  // - skip determination of recovered alerts
  // - pass through all existing alerts as active
  // - add any new alerts, up to the max allowed

  // Make a copy to avoid mutating the input
  const previousAlerts = cloneDeep(opts.context.previousActiveAlerts);

  const newAlertCapacity = opts.context.maxAlerts - opts.context.previousActiveAlerts.size;
  const newAlerts = filterFor(opts.alerts, AlertCategory.New);

  return [
    // existing alerts are all passed through as ongoing with updated duration
    ...[...previousAlerts.entries()].map(([_, alert]) => ({
      alert: alert.updateDuration(opts.context.startedAt),
      category: AlertCategory.Ongoing,
    })),
    // new alerts up to allowed capacity are passed through.
    ...newAlerts.slice(0, newAlertCapacity),
  ];
};

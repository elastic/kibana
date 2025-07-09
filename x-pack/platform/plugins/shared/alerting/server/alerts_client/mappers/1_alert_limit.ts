/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertInstanceContext, AlertInstanceState } from '../../types';
import { AlertCategory, type AlertsResult, type MapperOpts } from '../types';

export async function mapAlertLimit<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
>(
  opts: MapperOpts<State, Context, ActionGroupIds, RecoveryActionGroupId>
): Promise<AlertsResult<State, Context, ActionGroupIds, RecoveryActionGroupId>> {
  if (!opts.context.hasReachedAlertLimit) {
    // return all categorized alerts except existing ones
    return opts.alerts.filter(({ category }) => category !== AlertCategory.Existing);
  }

  // When the alert limit has been reached,
  // - skip determination of recovered alerts
  // - pass through all existing alerts as active
  // - add any new alerts, up to the max allowed

  const existingAlerts = opts.alerts.filter(({ category }) => category === AlertCategory.Existing);
  const newAlertCapacity = opts.context.maxAlerts - existingAlerts.length;
  const newAlerts = opts.alerts.filter(({ category }) => category === AlertCategory.New);
  const previouslyRecoveredAlerts = opts.alerts.filter(
    ({ category }) => category === AlertCategory.PreviouslyRecovered
  );

  return [
    ...existingAlerts.map(({ alert }) => {
      // existing alerts are all passed through as ongoing
      return {
        alert: alert.updateDuration(opts.context.startedAt),
        category: AlertCategory.Ongoing,
      };
    }),
    // new alerts up to allowed capacity are passed through.
    ...newAlerts.slice(0, newAlertCapacity),
    // previously recovered alerts are passed through
    ...previouslyRecoveredAlerts,
    // discard any recovered alerts...
  ];
}

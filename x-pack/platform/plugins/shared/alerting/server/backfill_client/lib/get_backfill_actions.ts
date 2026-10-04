/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleDomain } from '../../application/rule/types';
import type { NormalizedAlertActionWithGeneratedValues } from '../../rules_client';

interface BackfillActions {
  actions: NormalizedAlertActionWithGeneratedValues[];
  hasUnsupportedActions: boolean;
}

/** Selects the rule actions a backfill can run: `onActiveAlert` actions plus system actions. */
export function getBackfillActions({
  actions,
  systemActions,
  notifyWhen,
}: Pick<RuleDomain, 'actions' | 'systemActions' | 'notifyWhen'>): BackfillActions {
  const normalizedActions = actions.map((action) =>
    // if action level frequency is not defined and rule level notifyWhen is, set the action level frequency
    !action.frequency && notifyWhen
      ? { ...action, frequency: { notifyWhen, summary: false, throttle: null } }
      : action
  );

  return {
    actions: [
      ...normalizedActions.filter((action) => action.frequency?.notifyWhen === 'onActiveAlert'),
      ...(systemActions ?? []),
    ] as NormalizedAlertActionWithGeneratedValues[],
    hasUnsupportedActions: normalizedActions.some(
      (action) => action.frequency?.notifyWhen !== 'onActiveAlert'
    ),
  };
}

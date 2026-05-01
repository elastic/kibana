/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RawRuleSnoozedInstance } from '../../saved_objects/schemas/raw_rule';

export interface EvaluatePerAlertSnoozeResult {
  activeSnoozedIds: Set<string>;
  expiredInstances: RawRuleSnoozedInstance[];
}

export const evaluatePerAlertSnooze = (
  snoozedInstances: RawRuleSnoozedInstance[],
  now: Date
): EvaluatePerAlertSnoozeResult => {
  const activeSnoozedIds = new Set<string>();
  const expiredInstances: RawRuleSnoozedInstance[] = [];

  for (const instance of snoozedInstances) {
    const isExpired = instance.expiresAt != null && new Date(instance.expiresAt) <= now;
    if (isExpired) {
      expiredInstances.push(instance);
    } else {
      activeSnoozedIds.add(instance.instanceId);
    }
  }

  return { activeSnoozedIds, expiredInstances };
};

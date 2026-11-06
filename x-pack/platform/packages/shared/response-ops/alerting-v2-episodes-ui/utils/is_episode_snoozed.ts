/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';

/**
 * Whether notifications are currently snoozed for an episode/group.
 *
 * True when the latest snooze/unsnooze action is `snooze` and either there is
 * no `snoozed_until` (indefinite) or it is still in the future. Mirrors the KPI
 * ES|QL rule (`snoozed_until IS NULL OR TO_DATETIME(snoozed_until) > NOW()`).
 */
export const isEpisodeSnoozed = (
  lastSnoozeAction: string | null | undefined,
  snoozedUntil: string | null | undefined
): boolean => {
  if (lastSnoozeAction !== ALERT_EPISODE_ACTION_TYPE.SNOOZE) {
    return false;
  }

  if (snoozedUntil == null) {
    return true;
  }

  return new Date(snoozedUntil).getTime() > Date.now();
};

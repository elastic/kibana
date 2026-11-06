/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MatcherContext } from '@kbn/alerting-v2-schemas';
import type { Alert } from '../../types';

export function createMatcherContext(alert: Alert): MatcherContext {
  return {
    last_event_timestamp: alert.last_event_timestamp,
    group_hash: alert.group_hash,
    alert_id: alert.alert_id,
    alert_status: alert.alert_status,
    ...(alert.severity ? { severity: alert.severity } : {}),
    ...(alert.data ? { data: alert.data } : {}),
  };
}

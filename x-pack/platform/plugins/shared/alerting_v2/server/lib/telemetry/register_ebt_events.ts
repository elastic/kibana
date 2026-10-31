/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/server';
import { actionPolicyChangeTelemetryEvents } from './action_policy_ebt_event';
import { alertActionTelemetryEvents } from './alert_action_ebt_event';
import { ruleChangeTelemetryEvents } from './rule_ebt_event';

/** Registers every alerting v2 EBT event type with Core analytics. */
export const registerTelemetryEvents = (analytics: AnalyticsServiceSetup): void => {
  ruleChangeTelemetryEvents.forEach((eventConfig) => analytics.registerEventType(eventConfig));
  actionPolicyChangeTelemetryEvents.forEach((eventConfig) =>
    analytics.registerEventType(eventConfig)
  );
  alertActionTelemetryEvents.forEach((eventConfig) => analytics.registerEventType(eventConfig));
};

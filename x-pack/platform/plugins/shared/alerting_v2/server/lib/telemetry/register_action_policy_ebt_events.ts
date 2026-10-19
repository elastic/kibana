/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/server';
import { actionPolicyChangeTelemetryEvents } from './action_policy_ebt_event';

/** Registers every action policy change EBT event type with Core analytics. */
export const registerActionPolicyTelemetryEvents = (analytics: AnalyticsServiceSetup): void => {
  actionPolicyChangeTelemetryEvents.forEach((eventConfig) =>
    analytics.registerEventType(eventConfig)
  );
};

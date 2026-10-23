/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/server';
import { ruleChangeTelemetryEvents } from './rule_ebt_event';

/** Registers every rule-lifecycle EBT event type with Core analytics. */
export const registerTelemetryEvents = (analytics: AnalyticsServiceSetup): void => {
  ruleChangeTelemetryEvents.forEach((eventConfig) => analytics.registerEventType(eventConfig));
};

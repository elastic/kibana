/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getServices } from '../services';
import { CustomContentTelemetryService } from './telemetry_service';
import { registerCustomContentAnalyticsEvents } from './events_registration';
import { getAnalyticsSetup } from './analytics_setup';

let instance: CustomContentTelemetryService | undefined;

/**
 * Built on first use rather than at plugin start, so the service and the event schemas stay out of
 * the page-load bundle — every caller already lives in a lazily loaded chunk.
 *
 * Registration runs here rather than during setup so it is guaranteed to precede the first
 * `reportEvent`, which throws on an unregistered event type.
 */
export const getTelemetry = (): CustomContentTelemetryService => {
  if (!instance) {
    const analyticsSetup = getAnalyticsSetup();
    if (analyticsSetup) registerCustomContentAnalyticsEvents(analyticsSetup);
    instance = new CustomContentTelemetryService(getServices().core.analytics);
  }
  return instance;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/public';

let analyticsSetup: AnalyticsServiceSetup | undefined;

/**
 * Registering event types needs the setup contract — `AnalyticsServiceStart` only exposes
 * `reportEvent` — so it is captured here and used when telemetry is first requested.
 */
export const setAnalyticsSetup = (analytics: AnalyticsServiceSetup) => {
  analyticsSetup = analytics;
};

export const getAnalyticsSetup = (): AnalyticsServiceSetup | undefined => analyticsSetup;

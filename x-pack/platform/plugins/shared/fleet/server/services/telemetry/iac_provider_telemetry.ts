/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/server';

import type {
  IacProviderRenderCompletedFields,
  IacProviderRenderRequestedFields,
} from '../../../common/telemetry/iac_provider_events';
import {
  IAC_PROVIDER_RENDER_COMPLETED_EVENT,
  IAC_PROVIDER_RENDER_REQUESTED_EVENT,
  registerIacProviderTelemetryEvents,
} from '../../../common/telemetry/iac_provider_events';

let analytics: AnalyticsServiceSetup | undefined;

export const setupIacProviderTelemetry = (analyticsSetup: AnalyticsServiceSetup): void => {
  analytics = analyticsSetup;
  registerIacProviderTelemetryEvents(analyticsSetup);
};

export const reportIacProviderRenderRequested = (
  fields: IacProviderRenderRequestedFields
): void => {
  analytics?.reportEvent(IAC_PROVIDER_RENDER_REQUESTED_EVENT.eventType, fields);
};

export const reportIacProviderRenderCompleted = (
  fields: IacProviderRenderCompletedFields
): void => {
  analytics?.reportEvent(IAC_PROVIDER_RENDER_COMPLETED_EVENT.eventType, fields);
};

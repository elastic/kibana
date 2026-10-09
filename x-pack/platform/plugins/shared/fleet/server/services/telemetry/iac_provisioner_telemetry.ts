/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/server';

import type {
  IacProvisionerRenderCompletedFields,
  IacProvisionerRenderRequestedFields,
} from '../../../common/telemetry/iac_provisioner_events';
import {
  IAC_PROVISIONER_RENDER_COMPLETED_EVENT,
  IAC_PROVISIONER_RENDER_REQUESTED_EVENT,
  registerIacProvisionerTelemetryEvents,
} from '../../../common/telemetry/iac_provisioner_events';

let analytics: AnalyticsServiceSetup | undefined;

export const setupIacProvisionerTelemetry = (analyticsSetup: AnalyticsServiceSetup): void => {
  analytics = analyticsSetup;
  registerIacProvisionerTelemetryEvents(analyticsSetup);
};

export const reportIacProvisionerRenderRequested = (
  fields: IacProvisionerRenderRequestedFields
): void => {
  analytics?.reportEvent(IAC_PROVISIONER_RENDER_REQUESTED_EVENT.eventType, fields);
};

export const reportIacProvisionerRenderCompleted = (
  fields: IacProvisionerRenderCompletedFields
): void => {
  analytics?.reportEvent(IAC_PROVISIONER_RENDER_COMPLETED_EVENT.eventType, fields);
};

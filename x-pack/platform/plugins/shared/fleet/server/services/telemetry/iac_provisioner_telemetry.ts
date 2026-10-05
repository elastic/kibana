/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/server';

import type {
  IacKeyVerificationCompletedFields,
  IacProvisionerRenderCompletedFields,
  IacProvisionerRenderRequestedFields,
  IacUpgradeCheckCompletedFields,
} from '../../../common/telemetry/iac_provisioner_events';
import {
  IAC_PROVISIONER_KEY_VERIFICATION_COMPLETED_EVENT,
  IAC_PROVISIONER_RENDER_COMPLETED_EVENT,
  IAC_PROVISIONER_RENDER_REQUESTED_EVENT,
  IAC_PROVISIONER_UPGRADE_CHECK_COMPLETED_EVENT,
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

export const reportIacProvisionerKeyVerificationCompleted = (
  fields: IacKeyVerificationCompletedFields
): void => {
  analytics?.reportEvent(IAC_PROVISIONER_KEY_VERIFICATION_COMPLETED_EVENT.eventType, fields);
};

export const reportIacProvisionerUpgradeCheckCompleted = (
  fields: IacUpgradeCheckCompletedFields
): void => {
  analytics?.reportEvent(IAC_PROVISIONER_UPGRADE_CHECK_COMPLETED_EVENT.eventType, fields);
};

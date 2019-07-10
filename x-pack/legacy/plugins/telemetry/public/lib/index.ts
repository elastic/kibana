/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fetchTelemetry } from '../../../telemetry/public/hacks/fetch_telemetry';
export { PRIVACY_STATEMENT_URL } from '../../../telemetry/common/constants';
export { TelemetryOptInProvider } from '../../../telemetry/public/services/telemetry_opt_in';
export { OptInExampleFlyout } from '../../../telemetry/public/components';
import { createReporter, Reporter, ReportTypes } from '@kbn/analytics';


let telemetryEnabled: boolean;
let httpClient: any;
let telemetryOptInService: any;
let telemetryReporter: Reporter;

export const setTelemetryEnabled = (isTelemetryEnabled: boolean): void => {
  telemetryEnabled = isTelemetryEnabled;
};
export const setHttpClient = (anHttpClient: any): void => {
  httpClient = anHttpClient;
};
export const setTelemetryOptInService = (aTelemetryOptInService: any): void => {
  telemetryOptInService = aTelemetryOptInService;
};

export const setTelemetryReporter = (aTelemetryReporter: Reporter): void => {
  telemetryReporter = aTelemetryReporter;
}

export const getTelemetryRerporter = () => {
  return telemetryReporter;
}

export const getAnalytics = (appName: string) =>
  <K = ReportTypes>(type: K, eventName: string) => telemetryReporter.report(type, appName, eventName);

export const optInToTelemetry = async (enableTelemetry) => {
  await telemetryOptInService.setOptIn(enableTelemetry);
};
export const showTelemetryOptIn = () => {
  return telemetryEnabled && !telemetryOptInService.getOptIn();
};
export const getTelemetryFetcher = () => {
  return fetchTelemetry(httpClient);
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// / @ts-ignore
import { fetchTelemetry } from '../hacks/fetch_telemetry';
// / @ts-ignore
import { TelemetryOptInProvider } from '../services/telemetry_opt_in';

let telemetryEnabled: boolean;
let httpClient: any;
let telemetryOptInService: any;

export const setTelemetryEnabled = (isTelemetryEnabled: boolean): void => {
  telemetryEnabled = isTelemetryEnabled;
};
export const setHttpClient = (anHttpClient: any): void => {
  httpClient = anHttpClient;
};
export const setTelemetryOptInService = (aTelemetryOptInService: any): void => {
  telemetryOptInService = aTelemetryOptInService;
};
export const optInToTelemetry = async (enableTelemetry: boolean): Promise<void> => {
  await telemetryOptInService.setOptIn(enableTelemetry);
};
export const showTelemetryOptIn = (): boolean => {
  return telemetryEnabled && !telemetryOptInService.getOptIn();
};
export const getTelemetryFetcher = () => {
  return fetchTelemetry(httpClient);
};

export const initializeTelemetry = ($injector: any) => {
  const $http = $injector.get('$http');
  const isTelemetryEnabled = $injector.get('telemetryEnabled');
  const Private = $injector.get('Private');
  const telemetryOptInProvider = Private(TelemetryOptInProvider);
  setTelemetryEnabled(isTelemetryEnabled);
  setTelemetryOptInService(telemetryOptInProvider);
  setHttpClient($http);
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getApiPath } from '../../helper';

/**
 * Generates a function to log a page load of the monitor page for Kibana telemetry.
 * @returns a function that can log page loads
 */
export const getTelemetryMonitorPageLogger = (xsrf: string, basePath?: string) => async () => {
  const path = getApiPath('/api/uptime/logMonitor', basePath);
  await fetch(path, { method: 'POST', headers: { 'kbn-xsrf': xsrf } });
};

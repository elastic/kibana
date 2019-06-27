/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AnomaliesByHost } from './types';

export const createCompoundKey = (anomaliesByHost: AnomaliesByHost) => {
  return `${anomaliesByHost.hostName}-${anomaliesByHost.anomaly.entityName}-${
    anomaliesByHost.anomaly.entityValue
  }-${anomaliesByHost.anomaly.severity}-${anomaliesByHost.anomaly.jobId}`;
};

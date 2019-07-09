/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AnomaliesByHost, AnomaliesByNetwork } from '../types';

export const createCompoundHostKey = (anomaliesByHost: AnomaliesByHost): string =>
  `${anomaliesByHost.hostName}-${anomaliesByHost.anomaly.entityName}-${anomaliesByHost.anomaly.entityValue}-${anomaliesByHost.anomaly.severity}-${anomaliesByHost.anomaly.jobId}`;

export const createCompoundNetworkKey = (anomaliesByNetwork: AnomaliesByNetwork): string =>
  `${anomaliesByNetwork.ip}-${anomaliesByNetwork.anomaly.entityName}-${anomaliesByNetwork.anomaly.entityValue}-${anomaliesByNetwork.anomaly.severity}-${anomaliesByNetwork.anomaly.jobId}`;

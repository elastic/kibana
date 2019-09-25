/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APMClient } from '../../../../services/rest/createCallApmApi';

export interface Schedule {
  interval: string;
}

interface Arguments {
  callApmApi: APMClient;
  email: string;
  serviceName: string;
  slackUrl: string;
  threshold: number;
  timeRange: {
    value: number;
    unit: string;
  };
}

export async function createErrorOccurrenceAlert({
  callApmApi,
  email,
  serviceName,
  slackUrl,
  threshold,
  timeRange
}: Arguments) {
  return callApmApi({
    pathname: '/api/apm/alerts/error_occurrence',
    method: 'POST',
    params: {
      body: {
        serviceName,
        threshold,
        interval: `${timeRange.value}${timeRange.unit}`,
        actions: {
          email,
          slack: slackUrl
        }
      }
    }
  });
}

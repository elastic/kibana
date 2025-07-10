/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import { StreamEndpointLatencyProps } from './types';
import { STREAMS_ENDPOINT_LATENCY_EVENT } from './constants';

const LATENCY_TRACKING_ENDPOINT_ALLOW_LIST = [
  'POST /api/streams/{name}/processing/_simulate 2023-10-31',
  'POST /api/streams/{name}/processing/_suggestions 2023-10-31',
  'POST /api/streams/{name}/_fork 2023-10-31',
  'PUT /api/streams/{name}/dashboards/{dashboardId} 2023-10-31',
  'PUT /api/streams/{name} 2023-10-31',
  'PUT /api/streams/{name}/_group 2023-10-31',
  'PUT /api/streams/{name}/_ingest 2023-10-31',
  'DELETE /api/streams/{name} 2023-10-31',
  'POST /api/streams/_enable 2023-10-31',
  'POST /api/streams/_disable 2023-10-31',
  'POST /api/streams/_resync 2023-10-31',
];

export class StreamsTelemetryClient {
  constructor(private readonly analytics: AnalyticsServiceSetup) {}

  public startTrackingEndpointLatency(
    props: Pick<StreamEndpointLatencyProps, 'name' | 'endpoint'>
  ) {
    if (!LATENCY_TRACKING_ENDPOINT_ALLOW_LIST.includes(props.endpoint)) {
      return () => {};
    }
    const startTime = Date.now();
    return () => {
      this.analytics.reportEvent(STREAMS_ENDPOINT_LATENCY_EVENT, {
        ...props,
        duration_ms: Date.now() - startTime,
      });
    };
  }
}

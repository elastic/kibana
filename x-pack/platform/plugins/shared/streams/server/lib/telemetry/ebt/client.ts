/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import type { StreamEndpointLatencyProps, StreamsStateErrorProps } from './types';
import { STREAMS_ENDPOINT_LATENCY_EVENT, STREAMS_STATE_ERROR_EVENT } from './constants';

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

export class EbtTelemetryClient {
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

  public reportStreamsStateError(error: Error & { statusCode: number }) {
    const errorData: StreamsStateErrorProps = {
      error: {
        name: error.name,
        message: error.message,
        stack_trace: error.stack,
      },
      status_code: error.statusCode,
    };

    this.analytics.reportEvent(STREAMS_STATE_ERROR_EVENT, errorData);
  }
}

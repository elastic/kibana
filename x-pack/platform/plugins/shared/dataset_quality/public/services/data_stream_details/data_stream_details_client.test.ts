/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';

import type { ITelemetryClient } from '../telemetry';
import { DataStreamDetailsClient } from './data_stream_details_client';

describe('DataStreamDetailsClient', () => {
  it('encodes reserved characters in dataStream and degradedField path segments', async () => {
    const httpGet = jest.fn().mockResolvedValue({
      field: 'host/name#raw',
      values: ['example'],
    });
    const client = new DataStreamDetailsClient(
      { get: httpGet } as unknown as HttpStart,
      {} as ITelemetryClient
    );

    await client.getDataStreamDegradedFieldValues({
      dataStream: 'logs/app#prod',
      degradedField: 'host/name#raw',
    });

    expect(httpGet).toHaveBeenCalledWith(
      '/internal/dataset_quality/data_streams/logs%2Fapp%23prod/degraded_field/host%2Fname%23raw/values'
    );
  });
});

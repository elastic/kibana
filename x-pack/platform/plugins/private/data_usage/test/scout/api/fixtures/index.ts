/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture } from '@kbn/scout';
import { DATA_USAGE_DATA_STREAMS_API_ROUTE } from '../../../../common';
import type { DataStreamsResponseBodySchemaBody } from '../../../../server/routes/internal/data_streams';

export { apiTest } from '@kbn/scout';
export { createDataStream, deleteDataStream } from './data_streams';

// The metering API picks up new data streams with a delay
export const METERING_TIMEOUT_MS = 30_000;

export const LOCAL_SERVERLESS_TAGS = [
  '@local-serverless-security_complete',
  '@local-serverless-observability_complete',
  '@local-serverless-observability_logs_essentials',
  '@local-serverless-search',
];

export const getDataStreams = async (
  apiClient: ApiClientFixture,
  authHeader: Record<string, string>,
  { includeZeroStorage = true }: { includeZeroStorage?: boolean } = {}
) => {
  const response = await apiClient.get(
    `${DATA_USAGE_DATA_STREAMS_API_ROUTE}${includeZeroStorage ? '?includeZeroStorage=true' : ''}`,
    {
      headers: {
        'x-elastic-internal-origin': 'kibana',
        'elastic-api-version': '1',
        ...authHeader,
      },
      responseType: 'json',
    }
  );
  return {
    statusCode: response.statusCode,
    body: response.body,
    names:
      response.statusCode === 200
        ? (response.body as DataStreamsResponseBodySchemaBody).map(({ name }) => name)
        : [],
  };
};

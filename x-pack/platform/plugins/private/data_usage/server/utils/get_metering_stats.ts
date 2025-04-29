/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { type ElasticsearchClient } from '@kbn/core/server';

export interface MeteringStats {
  name: string;
  num_docs: number;
  size_in_bytes: number;
}

interface MeteringStatsResponse {
  datastreams: MeteringStats[];
}

export const getMeteringStats = (client: ElasticsearchClient) => {
  return client.transport.request<MeteringStatsResponse>({
    method: 'GET',
    path: '/_metering/stats',
  });
};

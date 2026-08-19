/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { parseError } from '../errors/parse_error';

export interface DataStreamGlobalRetention {
  default_retention?: string;
  max_retention?: string;
}

interface DataStreamLifecycleResponse {
  global_retention?: {
    default_retention?: string;
    max_retention?: string;
  };
}

export async function getDataStreamGlobalRetention({
  esClient,
  name,
}: {
  esClient: ElasticsearchClient;
  name: string;
}): Promise<DataStreamGlobalRetention> {
  // The data stream lifecycle response exposes the cluster-wide global retention (default/max)
  // at the top level, derived from the cluster settings by Elasticsearch. Unlike a direct
  // `cluster.getSettings` read, this endpoint is available to the current user in Serverless.
  try {
    const response = await esClient.transport.request<DataStreamLifecycleResponse>({
      method: 'GET',
      path: `/_data_stream/${encodeURIComponent(name)}/_lifecycle`,
    });
    const { default_retention: defaultRetention, max_retention: maxRetention } =
      response.global_retention ?? {};
    return {
      ...(defaultRetention ? { default_retention: defaultRetention } : {}),
      ...(maxRetention ? { max_retention: maxRetention } : {}),
    };
  } catch (error) {
    const { statusCode } = parseError(error);
    // Global retention is best-effort: a missing stream (404) or missing privileges (403)
    // degrade to "no constraint" rather than failing the whole request.
    if (statusCode !== 404 && statusCode !== 403) {
      throw error;
    }
    return {};
  }
}

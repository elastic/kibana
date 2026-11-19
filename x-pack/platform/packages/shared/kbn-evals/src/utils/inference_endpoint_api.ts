/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import { INFERENCE_ENDPOINT_INTERNAL_API_VERSION } from '@kbn/inference-common';

/**
 * Checks whether an ES inference endpoint exists via the `inference_endpoint` plugin's
 * internal `_exists` route.
 */
export async function inferenceEndpointExists({
  fetch,
  inferenceId,
}: {
  fetch: HttpHandler;
  inferenceId: string;
}): Promise<boolean> {
  const res = (await fetch({
    path: `/internal/_inference/_exists/${encodeURIComponent(inferenceId)}`,
    method: 'GET',
    headers: { 'elastic-api-version': INFERENCE_ENDPOINT_INTERNAL_API_VERSION },
  })) as { isEndpointExists?: boolean } | undefined;

  return res?.isEndpointExists === true;
}

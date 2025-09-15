/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient, BoundOptions, InferenceClient } from '@kbn/inference-common';
import type { HttpHandler } from '@kbn/core/public';
import { bindClient } from '../inference_client/bind_client';
import { createInferenceRestClient } from './inference_client';

interface RestOptions {
  fetch: HttpHandler;
  signal?: AbortSignal;
}

interface BoundRestOptions extends RestOptions {
  bindTo: BoundOptions;
}

export function createRestClient(options: RestOptions): InferenceClient;
export function createRestClient(options: BoundRestOptions): BoundInferenceClient;
export function createRestClient(
  options: RestOptions | BoundRestOptions
): BoundInferenceClient | InferenceClient {
  const { fetch, signal } = options;
  const client = createInferenceRestClient({ fetch, signal });
  if ('bindTo' in options) {
    return bindClient(client, options.bindTo);
  } else {
    return client;
  }
}

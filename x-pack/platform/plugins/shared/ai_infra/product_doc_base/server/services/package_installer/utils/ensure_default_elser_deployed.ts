/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { defaultInferenceEndpoints } from '@kbn/inference-common';

export const ensureInferenceDeployed = async ({
  client,
  inferenceId,
}: {
  client: ElasticsearchClient;
  inferenceId?: string;
}) => {
  if (!inferenceId) return;
  await client.inference.inference(
    {
      inference_id: inferenceId,
      input: 'I just want to call the API to force the model to download and allocate',
      timeout: '5m',
    },
    { requestTimeout: 10 * 60 * 1000 }
  );
};

export const ensureDefaultElserDeployed = async ({
  client,
  inferenceId = defaultInferenceEndpoints.ELSER,
}: {
  client: ElasticsearchClient;
  // Callers pass the actual resolved "default ELSER" variant (local ML or EIS-backed) —
  // isDefaultLinuxElserInferenceId() treats both as "default", but only one is actually
  // deployed on a given cluster (e.g. EIS-only on darwin-x86_64 Scout, no local ES ML).
  // Hardcoding defaultInferenceEndpoints.ELSER here warmed up an endpoint that doesn't
  // exist whenever the resolved default was the EIS variant.
  inferenceId?: string;
}) => {
  await ensureInferenceDeployed({
    client,
    inferenceId,
  });
};

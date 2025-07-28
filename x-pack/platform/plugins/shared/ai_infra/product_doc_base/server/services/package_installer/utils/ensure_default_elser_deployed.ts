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
    },
    { requestTimeout: 10 * 60 * 1000 }
  );
};

export const ensureDefaultElserDeployed = async ({ client }: { client: ElasticsearchClient }) => {
  await ensureInferenceDeployed({
    client,
    inferenceId: defaultInferenceEndpoints.ELSER,
  });
};

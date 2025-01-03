/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';

const inferenceEndpointId = 'kibana-elser2';

export const installElser = async ({ client }: { client: Client }) => {
  const getInferenceRes = await client.inference.get(
    {
      task_type: 'sparse_embedding',
      inference_id: 'kibana-elser2',
    },
    { ignore: [404] }
  );

  const installed = (getInferenceRes.endpoints ?? []).some(
    (endpoint) => endpoint.inference_id === inferenceEndpointId
  );

  if (!installed) {
    await client.inference.put({
      task_type: 'sparse_embedding',
      inference_id: inferenceEndpointId,
      inference_config: {
        service: 'elser',
        service_settings: {
          num_allocations: 1,
          num_threads: 1,
          model_id: '.elser_model_2',
        },
        task_settings: {},
      },
    });
  }

  await waitUntilDeployed({
    modelId: '.elser_model_2',
    client,
  });
};

const waitUntilDeployed = async ({
  modelId,
  client,
  maxRetries = 20,
  delay = 2000,
}: {
  modelId: string;
  client: Client;
  maxRetries?: number;
  delay?: number;
}) => {
  for (let i = 0; i < maxRetries; i++) {
    const statsRes = await client.ml.getTrainedModelsStats({
      model_id: modelId,
    });
    const deploymentStats = statsRes.trained_model_stats[0]?.deployment_stats;
    if (!deploymentStats || deploymentStats.nodes.length === 0) {
      await sleep(delay);
      continue;
    }
    return;
  }

  throw new Error(`Timeout waiting for ML model ${modelId} to be deployed`);
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

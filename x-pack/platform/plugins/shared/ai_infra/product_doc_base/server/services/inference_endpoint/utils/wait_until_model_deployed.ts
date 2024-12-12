/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

export const waitUntilModelDeployed = async ({
  modelId,
  client,
  log,
  maxRetries = 20,
  delay = 2000,
}: {
  modelId: string;
  client: ElasticsearchClient;
  log: Logger;
  maxRetries?: number;
  delay?: number;
}) => {
  for (let i = 0; i < maxRetries; i++) {
    const statsRes = await client.ml.getTrainedModelsStats({
      model_id: modelId,
    });
    const deploymentStats = statsRes.trained_model_stats[0]?.deployment_stats;
    // @ts-expect-error wrong client types
    if (!deploymentStats || deploymentStats.nodes.length === 0) {
      log.debug(`ML model [${modelId}] was not deployed - attempt ${i + 1} of ${maxRetries}`);
      await sleep(delay);
      continue;
    }
    return;
  }

  throw new Error(`Timeout waiting for ML model ${modelId} to be deployed`);
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

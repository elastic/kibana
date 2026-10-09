/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutWorkerFixtures } from '@kbn/scout';

export const uniqueName = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const deletePipeline = async ({
  esClient,
  pipelineName,
  log,
}: {
  esClient: ScoutWorkerFixtures['esClient'];
  pipelineName: string;
  log?: ScoutWorkerFixtures['log'];
}) => {
  try {
    await esClient.ingest.deletePipeline({ id: pipelineName });
  } catch (error) {
    if (log) {
      await log.debug(`Pipeline cleanup failed for ${pipelineName}: ${(error as Error).message}`);
    }
  }
};

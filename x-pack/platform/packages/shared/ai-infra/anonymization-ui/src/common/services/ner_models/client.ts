/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';

export interface TrainedModelStatsResponse {
  trained_model_stats?: Array<{
    deployment_stats?: {
      state?: string;
    };
  }>;
}

export interface NerModelsClient {
  getTrainedModelStats: (modelId: string) => Promise<TrainedModelStatsResponse>;
}

interface NerModelsHttpService {
  fetch: HttpSetup['fetch'];
}

export const createNerModelsClient = ({ fetch }: NerModelsHttpService): NerModelsClient => ({
  getTrainedModelStats: (modelId: string) =>
    fetch<TrainedModelStatsResponse>(`/_ml/trained_models/${encodeURIComponent(modelId)}/_stats`, {
      method: 'GET',
    }),
});

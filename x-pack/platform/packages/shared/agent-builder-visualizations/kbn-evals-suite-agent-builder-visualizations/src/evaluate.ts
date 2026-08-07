/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate as evalsBase } from '@kbn/evals';
import { VisualizationAgentEvaluationChatClient } from './chat_client';
import type { EvaluateDataset } from './evaluate_dataset';
import { createEvaluateDataset } from './evaluate_dataset';

export const evaluate = evalsBase.extend<
  {},
  {
    chatClient: VisualizationAgentEvaluationChatClient;
    evaluateDataset: EvaluateDataset;
  }
>({
  chatClient: [
    async ({ fetch, log, connector }, use) => {
      await use(new VisualizationAgentEvaluationChatClient(fetch, log, connector.id));
    },
    { scope: 'worker' },
  ],
  evaluateDataset: [
    ({ chatClient, evaluators, executorClient, inferenceClient, esClient, log }, use) => {
      use(
        createEvaluateDataset({
          chatClient,
          evaluators,
          executorClient,
          inferenceClient,
          esClient,
          log,
        })
      );
    },
    { scope: 'worker' },
  ],
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate as evalsBase } from '@kbn/evals';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import type { EvaluateDataset } from './evaluate_dataset';
import { createEvaluateDataset } from './evaluate_dataset';

export const evaluate = evalsBase.extend<
  {},
  {
    evaluateDataset: EvaluateDataset;
  }
>({
  evaluateDataset: [
    ({ agentBuilderClient, evaluators, executorClient, inferenceClient, esClient, log }, use) => {
      use(
        createEvaluateDataset({
          agentBuilderClient,
          agentId: agentBuilderDefaultAgentId,
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

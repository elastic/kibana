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
import type { EvaluateCustomContentDataset } from './custom_content/evaluate_custom_content_dataset';
import { createEvaluateCustomContentDataset } from './custom_content/evaluate_custom_content_dataset';
import type { EvaluateRoutingDataset } from './custom_content/routing/evaluate_routing_dataset';
import { createEvaluateRoutingDataset } from './custom_content/routing/evaluate_routing_dataset';

export const evaluate = evalsBase.extend<
  {},
  {
    evaluateDataset: EvaluateDataset;
    evaluateCustomContentDataset: EvaluateCustomContentDataset;
    evaluateRoutingDataset: EvaluateRoutingDataset;
  }
>({
  evaluateDataset: [
    (
      {
        agentBuilderClient,
        evaluators,
        executorClient,
        inferenceClient,
        evaluationConnector,
        esClient,
        log,
      },
      use
    ) => {
      use(
        createEvaluateDataset({
          agentBuilderClient,
          agentId: agentBuilderDefaultAgentId,
          evaluators,
          executorClient,
          // LLM judges run on the --judge connector, not the model under test.
          inferenceClient: inferenceClient.bindTo({ connectorId: evaluationConnector.id }),
          judgeConnector: evaluationConnector,
          esClient,
          log,
        })
      );
    },
    { scope: 'worker' },
  ],
  evaluateCustomContentDataset: [
    ({ agentBuilderClient, evaluators, executorClient, esClient, log }, use) => {
      use(
        createEvaluateCustomContentDataset({
          agentBuilderClient,
          agentId: agentBuilderDefaultAgentId,
          evaluators,
          executorClient,
          esClient,
          log,
        })
      );
    },
    { scope: 'worker' },
  ],
  evaluateRoutingDataset: [
    ({ agentBuilderClient, evaluators, executorClient, log }, use) => {
      use(
        createEvaluateRoutingDataset({
          agentBuilderClient,
          agentId: agentBuilderDefaultAgentId,
          evaluators,
          executorClient,
          log,
        })
      );
    },
    { scope: 'worker' },
  ],
});

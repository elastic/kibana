/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getStringMeta,
  type AgentBuilderClient,
  type DefaultEvaluators,
  type EvalsExecutorClient,
  type EvaluationDataset,
  type Evaluator,
  type ExperimentTask,
} from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';
import { withLowScoreLogging } from '../../evaluator_utils';
import { getToolIds } from '../../extract_visualization';
import { getRequestedRenderers } from './requested_renderers';
import { createRoutingEvaluator } from './routing_evaluator';
import type { RoutingEvaluator, RoutingExample, RoutingTaskOutput } from './types';

export type EvaluateRoutingDataset = ({
  dataset,
}: {
  dataset: { name: string; description: string; examples: RoutingExample[] };
}) => Promise<void>;

const useAgentTraceId = (evaluator: Evaluator): RoutingEvaluator => ({
  ...evaluator,
  evaluate: async ({ input, output, expected, metadata }) =>
    evaluator.evaluate({
      input,
      output: { ...output, traceId: output.agentTraceId ?? output.traceId },
      expected,
      metadata,
    }),
});

/** Scores which renderer the agent picks when the prompt does not say "custom panel". */
export function createEvaluateRoutingDataset({
  agentBuilderClient,
  agentId: defaultAgentId,
  evaluators,
  executorClient,
  log,
}: {
  agentBuilderClient: AgentBuilderClient;
  agentId: string;
  evaluators: DefaultEvaluators;
  executorClient: EvalsExecutorClient;
  log: ToolingLog;
}): EvaluateRoutingDataset {
  return async function evaluateRoutingDataset({ dataset: { name, description, examples } }) {
    const dataset = { name, description, examples } satisfies EvaluationDataset;

    const task: ExperimentTask<RoutingExample, RoutingTaskOutput> = async ({ input, metadata }) => {
      const agentId = getStringMeta(metadata, 'agentId') ?? defaultAgentId;
      const response = await agentBuilderClient.converse({ agentId, input: input?.question ?? '' });

      const renderers = getRequestedRenderers(response.steps);
      const toolIds = getToolIds({ steps: response.steps ?? [] });
      log.info(
        `[custom content routing] "${(input?.question ?? '').slice(0, 60)}": ` +
          `renderers: ${renderers.join(', ') || '(none)'}; tools: ${toolIds.join(' > ')}`
      );

      return {
        errors: [],
        messages: [{ message: response.message }],
        steps: response.steps,
        renderers,
        toolIds,
        agentTraceId: response.traceId,
        prompts: response.prompts ?? [],
      };
    };

    await executorClient.runExperiment({ datasets: [dataset], task }, [
      withLowScoreLogging(createRoutingEvaluator() as RoutingEvaluator, log),
      ...Object.values(evaluators.traceBasedEvaluators).map(useAgentTraceId),
    ]);
  };
}

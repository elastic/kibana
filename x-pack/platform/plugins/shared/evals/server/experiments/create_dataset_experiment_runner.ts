/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import type { Example, Evaluator, TaskOutput, EvaluationDataset } from '@kbn/evals-runner';
import type { ExperimentSuiteRunContext, ExperimentSuiteLogger } from './types';

export interface TaskContext {
  inferenceClient: BoundInferenceClient;
  abortSignal: AbortSignal;
  logger: ExperimentSuiteLogger;
}

export interface EvaluatorContext {
  judgeInferenceClient: BoundInferenceClient;
  logger: ExperimentSuiteLogger;
}

export interface DatasetExperimentConfig {
  datasetName: string;
  task: (ctx: TaskContext, example: Example) => Promise<TaskOutput>;
  evaluators: (ctx: EvaluatorContext) => Evaluator[];
  concurrency?: number;
}

/**
 * Creates a standard `run()` implementation for experiment suites that follow the
 * common pattern: resolve a dataset by name, run an inference task per example,
 * then score each output with evaluators.
 *
 * Delegates to `executorClient.runExperiment()` with `trustUpstreamDataset: true`,
 * meaning the dataset is resolved from the evals plugin's dataset storage at runtime.
 */
export const createDatasetExperimentRunner = (config: DatasetExperimentConfig) => {
  return async (ctx: ExperimentSuiteRunContext) => {
    const dataset: EvaluationDataset = {
      name: config.datasetName,
      description: '',
      examples: [],
    };

    const taskCtx: TaskContext = {
      inferenceClient: ctx.inferenceClient,
      abortSignal: ctx.abortSignal,
      logger: ctx.logger,
    };

    const evalCtx: EvaluatorContext = {
      judgeInferenceClient: ctx.judgeInferenceClient,
      logger: ctx.logger,
    };

    ctx.logger.info(`Running experiment for dataset "${config.datasetName}"`);

    await ctx.executorClient.runExperiment(
      {
        dataset,
        task: (example) => config.task(taskCtx, example),
        concurrency: config.concurrency ?? 5,
        trustUpstreamDataset: true,
      },
      config.evaluators(evalCtx)
    );
  };
};

/**
 * A generic inference task that sends the example's input as the user message
 * and returns the LLM content. Suitable for suites that simply need to pass
 * each example through the configured task model.
 */
export const genericInferenceTask = async (
  ctx: TaskContext,
  example: Example
): Promise<TaskOutput> => {
  const input = example.input ?? {};
  const userMessage =
    typeof input === 'string' ? input : input.question ?? input.prompt ?? JSON.stringify(input);

  const response = await ctx.inferenceClient.chatComplete({
    messages: [{ role: MessageRole.User, content: String(userMessage) }],
    abortSignal: ctx.abortSignal,
  });

  return response.content;
};

/**
 * Creates a basic LLM criteria evaluator. Sends input/output pairs to the judge
 * model with criteria and returns a normalised score (0-1).
 *
 * This is a lightweight server-safe alternative to the criteria evaluator in
 * `@kbn/evals` (which is devOnly and requires `@kbn/tooling-log`).
 */
export const createServerCriteriaEvaluator = ({
  inferenceClient,
  criteria,
}: {
  inferenceClient: BoundInferenceClient;
  criteria: string[];
}): Evaluator => ({
  name: 'criteria',
  kind: 'LLM',
  evaluate: async ({ input, output, expected }) => {
    const criteriaList = criteria.map((c, i) => `${i + 1}. ${c}`).join('\n');
    const prompt = `You are an expert evaluator. Score the following output against each criterion as PASS or FAIL.

Input: ${JSON.stringify(input ?? {})}
Output: ${JSON.stringify(output)}
${expected != null ? `Expected: ${JSON.stringify(expected)}` : ''}

Criteria:
${criteriaList}

Respond ONLY with a JSON object:
{"evaluations":[{"criterion":1,"result":"PASS"|"FAIL","reason":"..."},...]}`;

    const response = await inferenceClient.chatComplete({
      messages: [{ role: MessageRole.User, content: prompt }],
      temperature: 0,
    });

    try {
      const text = typeof response.content === 'string' ? response.content : '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { score: null, label: 'parse-error', explanation: 'Could not parse judge response' };
      }

      const parsed = JSON.parse(jsonMatch[0]) as {
        evaluations: Array<{ criterion: number; result: string; reason?: string }>;
      };
      const evals = parsed.evaluations ?? [];
      const passed = evals.filter((e) => e.result === 'PASS').length;
      const total = evals.length || 1;

      return {
        score: passed / total,
        label: passed === total ? 'pass' : 'partial',
        explanation: evals
          .map((e) => `Criterion ${e.criterion}: ${e.result} — ${e.reason ?? ''}`)
          .join('\n'),
        metadata: { evaluations: evals },
      };
    } catch {
      return { score: null, label: 'parse-error', explanation: 'Failed to parse judge JSON' };
    }
  },
});

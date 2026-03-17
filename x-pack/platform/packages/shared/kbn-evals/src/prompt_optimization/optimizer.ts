/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient } from '@kbn/inference-common';
import type {
  EvaluationDataset,
  Evaluator,
  ExperimentTask,
  Example,
  TaskOutput,
  EvalsExecutorClient,
} from '../types';

interface OptimizationConfig {
  /** Maximum number of hill-climbing iterations */
  maxIterations: number;
  /** Temperature for prompt mutation (0-1). Higher = more creative mutations */
  mutationTemperature?: number;
}

interface IterationResult {
  prompt: string;
  score: number;
  improved: boolean;
}

export interface OptimizationResult {
  bestPrompt: string;
  bestScore: number;
  iterations: IterationResult[];
  improvement: number;
}

const MUTATION_SYSTEM_PROMPT = `You are a prompt engineering expert. Your job is to improve a system prompt by making targeted modifications.

You will receive:
1. The current best prompt
2. Its performance score (0-1)
3. An iteration number

Make ONE targeted improvement to the prompt. Focus on:
- Clarity of instructions
- Specificity of expected output format
- Edge case handling
- Tone and style consistency
- Removal of ambiguous language

Return the improved prompt as structured output.`;

const buildMutationInput = (currentPrompt: string, score: number, iteration: number): string => {
  return `## Current Prompt (score: ${score.toFixed(3)}, iteration: ${iteration})

${currentPrompt}

## Instructions
Make one targeted improvement to this prompt to increase its evaluation score. The prompt is used as a system prompt for an AI assistant.`;
};

const mutationSchema = {
  type: 'object' as const,
  properties: {
    improved_prompt: { type: 'string' as const },
    change_description: { type: 'string' as const },
  },
  required: ['improved_prompt', 'change_description'] as const,
} as const;

/**
 * Hill-climbing prompt optimizer.
 *
 * Runs N iterations of: mutate prompt -> run experiment -> score -> keep if improved.
 * Uses the existing EvalsExecutorClient patterns from src/kibana_evals_executor/client.ts.
 */
export const optimizePrompt = async (options: {
  basePrompt: string;
  dataset: EvaluationDataset;
  task: ExperimentTask<Example, TaskOutput>;
  evaluators: Evaluator[];
  executorClient: EvalsExecutorClient;
  inferenceClient: BoundInferenceClient;
  config: OptimizationConfig;
  createTaskWithPrompt?: (prompt: string) => ExperimentTask<Example, TaskOutput>;
}): Promise<OptimizationResult> => {
  const {
    basePrompt,
    dataset,
    task,
    evaluators,
    executorClient,
    inferenceClient,
    config,
    createTaskWithPrompt,
  } = options;

  let bestPrompt = basePrompt;
  const initialScore = await scorePrompt(executorClient, dataset, task, evaluators);
  let bestScore = initialScore;
  const iterations: IterationResult[] = [];
  let staleCount = 0;
  const maxStale = 3;

  for (let i = 0; i < config.maxIterations; i++) {
    const candidatePrompt = await mutatePrompt(
      inferenceClient,
      bestPrompt,
      bestScore,
      i
    );

    const candidateTask = createTaskWithPrompt
      ? createTaskWithPrompt(candidatePrompt)
      : task;
    const candidateScore = await scorePrompt(executorClient, dataset, candidateTask, evaluators);

    const improved = candidateScore > bestScore;
    iterations.push({
      prompt: candidatePrompt,
      score: candidateScore,
      improved,
    });

    if (improved) {
      bestPrompt = candidatePrompt;
      bestScore = candidateScore;
      staleCount = 0;
    } else {
      staleCount++;
      if (staleCount >= maxStale) break;
    }
  }

  const improvement =
    initialScore > 0 ? ((bestScore - initialScore) / initialScore) * 100 : 0;

  return {
    bestPrompt,
    bestScore,
    iterations,
    improvement,
  };
};

const mutatePrompt = async (
  inferenceClient: BoundInferenceClient,
  currentPrompt: string,
  score: number,
  iteration: number
): Promise<string> => {
  const response = await inferenceClient.output({
    id: 'prompt_mutation',
    system: MUTATION_SYSTEM_PROMPT,
    input: buildMutationInput(currentPrompt, score, iteration),
    schema: mutationSchema,
  });

  return response.output?.improved_prompt || currentPrompt;
};

const scorePrompt = async (
  executorClient: EvalsExecutorClient,
  dataset: EvaluationDataset,
  task: ExperimentTask<Example, TaskOutput>,
  evaluators: Evaluator[]
): Promise<number> => {
  const experiment = await executorClient.runExperiment(
    { dataset, task, concurrency: 1 },
    evaluators
  );

  const scores = experiment.evaluationRuns
    .map((run) => run.result?.score)
    .filter((s): s is number => typeof s === 'number' && Number.isFinite(s));

  if (scores.length === 0) return 0;
  return scores.reduce((sum, s) => sum + s, 0) / scores.length;
};

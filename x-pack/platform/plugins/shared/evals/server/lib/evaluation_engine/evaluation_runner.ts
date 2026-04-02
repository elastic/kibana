/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { Logger } from '@kbn/logging';
import type {
  EvaluatorRegistry,
  ServerEvaluator,
  ServerEvaluatorParams,
  ServerEvaluatorResult,
} from './evaluator_registry';

export interface EvaluationRunConfig {
  items: Array<{
    input: Record<string, unknown>;
    output?: unknown;
    expected?: unknown;
    metadata?: Record<string, unknown>;
  }>;
  evaluatorNames: string[];
  connectorId: string;
  concurrency?: number;
  persist?: boolean;
  datasetId?: string;
  requiredPass?: string[];
  /** Inference client for LLM-judge evaluators. Without this, LLM evaluators will error. */
  inferenceClient?: unknown;
  /** ES client for ES|QL evaluators */
  esClient?: unknown;
}

export interface EvaluationRunResult {
  runId: string;
  results: Array<{
    itemIndex: number;
    evaluatorResults: ServerEvaluatorResult[];
  }>;
  durationMs: number;
  timestamp: string;
}

const createSemaphore = (max: number) => {
  let current = 0;
  const queue: Array<() => void> = [];

  const acquire = (): Promise<void> => {
    if (current < max) {
      current++;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      queue.push(resolve);
    });
  };

  const release = () => {
    current--;
    const next = queue.shift();
    if (next) {
      current++;
      next();
    }
  };

  return { acquire, release };
};

const runEvaluator = async (
  evaluator: ServerEvaluator,
  params: ServerEvaluatorParams
): Promise<ServerEvaluatorResult> => {
  try {
    return await evaluator.evaluate(params);
  } catch (error) {
    return {
      evaluator: evaluator.name,
      kind: evaluator.kind,
      score: null,
      label: 'error',
      explanation: error instanceof Error ? error.message : String(error),
    };
  }
};

export const createEvaluationRunner = (registry: EvaluatorRegistry, logger: Logger) => {
  const run = async (config: EvaluationRunConfig): Promise<EvaluationRunResult> => {
    const startTime = Date.now();
    const runId = randomUUID();
    const concurrency = config.concurrency ?? 5;
    const semaphore = createSemaphore(concurrency);

    const resolvedEvaluators: ServerEvaluator[] = [];
    for (const name of config.evaluatorNames) {
      const evaluator = registry.get(name);
      if (!evaluator) {
        throw new Error(`Evaluator not found: ${name}`);
      }
      resolvedEvaluators.push(evaluator);
    }

    const codeEvaluators = resolvedEvaluators.filter((e) => e.kind === 'CODE');
    const llmEvaluators = resolvedEvaluators.filter((e) => e.kind === 'LLM');
    const requiredPassSet = new Set(config.requiredPass ?? []);

    const results = await Promise.all(
      config.items.map(async (item, itemIndex) => {
        await semaphore.acquire();
        try {
          const params: ServerEvaluatorParams = {
            input: item.input,
            output: item.output,
            expected: item.expected,
            metadata: item.metadata,
            inferenceClient: config.inferenceClient,
            esClient: config.esClient,
          };

          const evaluatorResults: ServerEvaluatorResult[] = [];

          // Run CODE evaluators first
          for (const evaluator of codeEvaluators) {
            const result = await runEvaluator(evaluator, params);
            evaluatorResults.push(result);
          }

          // Check required-pass gates: "must not fail" means score must be non-null and > 0
          const requiredFailed = evaluatorResults.some(
            (r) => requiredPassSet.has(r.evaluator) && (r.score === null || r.score === 0)
          );

          if (!requiredFailed) {
            // Run LLM evaluators only if CODE evaluators pass
            for (const evaluator of llmEvaluators) {
              const result = await runEvaluator(evaluator, params);
              evaluatorResults.push(result);
            }
          } else {
            // Skip LLM evaluators, mark as skipped
            for (const evaluator of llmEvaluators) {
              evaluatorResults.push({
                evaluator: evaluator.name,
                kind: evaluator.kind,
                score: null,
                label: 'skipped',
                explanation: 'Skipped because a required CODE evaluator failed',
              });
            }
          }

          return { itemIndex, evaluatorResults };
        } catch (error) {
          logger.error(`Error evaluating item ${itemIndex}: ${error}`);
          return {
            itemIndex,
            evaluatorResults: resolvedEvaluators.map((e) => ({
              evaluator: e.name,
              kind: e.kind,
              score: null,
              label: 'error',
              explanation: error instanceof Error ? error.message : String(error),
            })),
          };
        } finally {
          semaphore.release();
        }
      })
    );

    return {
      runId,
      results,
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  };

  return { run };
};

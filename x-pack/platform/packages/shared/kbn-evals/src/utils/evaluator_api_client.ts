/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/kbn-client';
import type { SomeDevLog } from '@kbn/some-dev-log';
import {
  API_VERSIONS,
  EVALS_EVALUATE_URL,
  EvaluateResponse,
  type EvaluateRequestBodyInput,
} from '@kbn/evals-common';
import type { Evaluator, EvaluatorKind, EvaluatorParams, Example, TaskOutput } from '../types';

export type MapContextFn<TOutput = TaskOutput> = (params: EvaluatorParams<Example, TOutput>) => {
  trace_id: string;
  reference_data?: Record<string, unknown>;
};

const defaultMapContext: MapContextFn = ({ output, expected }) => ({
  trace_id: (output as Record<string, unknown>)?.traceId as string,
  reference_data: expected as Record<string, unknown> | undefined,
});

const VERSIONED_HEADERS = { 'elastic-api-version': API_VERSIONS.internal.v1 };

type EvaluationScore = NonNullable<EvaluateResponse['results'][number]['scores']>[number];

interface ScoreSelector {
  name: string;
  pickScore: (scores?: EvaluationScore[]) => EvaluationScore | undefined;
  describe: string;
}

/** `key` matches the score's `name` in the API response; `evaluatorName` is the name it's reported under. */
export interface SubScore {
  key: string;
  evaluatorName: string;
}

export interface EvaluatorConfig {
  name: string;
  kind: EvaluatorKind;
  version?: string;
  connectorId?: string;
  /** When set, the evaluator is composite: one output evaluator is produced per sub-score. */
  subScores?: SubScore[];
}

const getResponseData = (response: unknown): unknown => {
  if (typeof response === 'object' && response !== null && 'data' in response) {
    return (response as { data: unknown }).data;
  }
  return response;
};

export class EvaluatorApiClient {
  constructor(private readonly kbnClient: KbnClient, private readonly log: SomeDevLog) {}

  async evaluate(body: EvaluateRequestBodyInput): Promise<EvaluateResponse> {
    const response = await this.kbnClient.request({
      path: EVALS_EVALUATE_URL,
      method: 'POST',
      body,
      headers: VERSIONED_HEADERS,
    });
    return EvaluateResponse.parse(getResponseData(response));
  }

  /** Converts configs into {@link Evaluator}s, batching all configs into one API call per trace. */
  toEvaluators(
    configs: EvaluatorConfig[],
    options: { mapContext?: MapContextFn } = {}
  ): Evaluator[] {
    const { mapContext } = options;
    const evaluationsByTrace = new Map<string, Promise<EvaluateResponse>>();

    const evaluateForTrace = (params: EvaluatorParams<Example, TaskOutput>) => {
      const mapped = (mapContext ?? defaultMapContext)(params);
      const traceId = mapped.trace_id;
      const existing = evaluationsByTrace.get(traceId);
      if (existing) {
        return existing;
      }

      const evaluation = this.evaluate({
        subject: {
          mode: 'single-turn',
          traces: [mapped],
        },
        evaluators: configs.map(({ name, version, connectorId }) => ({
          name,
          version,
          connector_id: connectorId,
        })),
      });
      evaluationsByTrace.set(traceId, evaluation);
      return evaluation;
    };

    return configs.flatMap((config) => {
      const outputs: ScoreSelector[] = config.subScores
        ? config.subScores.map(({ key, evaluatorName }) => ({
            name: evaluatorName,
            pickScore: (scores) => scores?.find((entry) => entry.name === key),
            describe: `sub-score "${key}"`,
          }))
        : [
            {
              name: config.name,
              pickScore: (scores) => scores?.[0],
              describe: 'score',
            },
          ];

      return outputs.map(({ name, pickScore, describe }) => ({
        name,
        kind: config.kind,
        evaluate: async (params) => {
          try {
            const result = await evaluateForTrace(params);
            const item = result.results.find((entry) => entry.evaluator.name === config.name);
            if (!item) {
              throw new Error(`No evaluation result returned for "${config.name}"`);
            }
            if (item.status === 'error') {
              throw new Error(item.error?.message ?? `Evaluator "${config.name}" failed`);
            }
            const score = pickScore(item.scores);
            if (!score) {
              throw new Error(`No ${describe} returned for "${config.name}"`);
            }
            return {
              score: score.score,
              label: score.label,
              explanation: score.explanation,
              metadata: score.metadata,
            };
          } catch (error) {
            this.log.error(`Failed to execute evaluator "${config.name}" ${describe}: ${error}`);
            throw error;
          }
        },
      }));
    });
  }
}

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
  EVALS_EVALUATOR_URL,
  EVALS_EVALUATORS_URL,
  EvaluateResponse,
  type EvaluateRequestBodyInput,
  type Direction,
  type Model,
  type UserDefinedEvaluatorDraft,
} from '@kbn/evals-common';
import type { Evaluator, EvaluatorKind, EvaluatorParams, Example, TaskOutput } from '../types';
import { isMultiTurnResult, overallExpectation } from '../multi_turn/turn_evaluators';

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
  /**
   * Whether a higher score is an improvement (`maximize`), a lower score is
   * an improvement (`minimize`), or the score cannot be compared across arms
   * at all (`neutral`).
   */
  direction: Direction;
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

  /** Saves a user-defined judge, e.g. one with `transcript` evidence for conversation grading. */
  async createEvaluator(draft: UserDefinedEvaluatorDraft): Promise<void> {
    await this.kbnClient.request({
      path: EVALS_EVALUATORS_URL,
      method: 'POST',
      body: draft,
      headers: VERSIONED_HEADERS,
    });
  }

  /** Deletes every version of a user-defined evaluator. */
  async deleteEvaluator(name: string): Promise<void> {
    await this.kbnClient.request({
      path: EVALS_EVALUATOR_URL.replace('{name}', encodeURIComponent(name)),
      method: 'DELETE',
      headers: VERSIONED_HEADERS,
    });
  }

  /** Converts configs into {@link Evaluator}s, batching all configs into one API call per trace. */
  toEvaluators(
    configs: EvaluatorConfig[],
    options: { mapContext?: MapContextFn } = {}
  ): Evaluator[] {
    const { mapContext } = options;
    return this.buildEvaluators(configs, '', (params) => {
      const mapped = (mapContext ?? defaultMapContext)(params);
      return { key: mapped.trace_id, subject: { mode: 'single-turn', traces: [mapped] } };
    });
  }

  /**
   * Converts configs into {@link Evaluator}s that grade a multi-turn run in Kibana: every turn's
   * trace is sent in order as one `multi-turn` subject. Conversation-scoped evaluators (such as
   * judges with `transcript` evidence) read all turns; the others grade the last one. Scores are
   * reported as `<name> [conversation]`.
   */
  toConversationEvaluators(
    configs: EvaluatorConfig[],
    { conversation }: { conversation?: string } = {}
  ): Evaluator[] {
    const suffix = conversation ? ` [conversation: ${conversation}]` : ' [conversation]';
    return this.buildEvaluators(configs, suffix, ({ output, expected }) => {
      if (!isMultiTurnResult(output)) {
        return { unavailable: 'The task output is not a multi-turn result' };
      }
      const conversationResult = conversation
        ? output.conversations.find(({ key }) => key === conversation)
        : output.conversations.at(-1);
      const turns = conversationResult?.turns ?? [];
      if (turns.length === 0) {
        return { unavailable: 'No turns to grade' };
      }
      const untraced = turns.filter(({ traceId }) => !traceId).map(({ id }) => id);
      if (untraced.length > 0) {
        return { unavailable: `Turns without a trace: ${untraced.join(', ')}` };
      }
      const referenceData = overallExpectation(expected);
      return {
        key: turns.map(({ traceId }) => traceId).join(','),
        subject: {
          mode: 'multi-turn',
          traces: turns.map(({ id, traceId }, index) => ({
            trace_id: traceId!,
            turn_id: id,
            // Reference data rides on the last turn, the one turn-scoped evaluators grade.
            ...(referenceData && index === turns.length - 1
              ? { reference_data: referenceData }
              : {}),
          })),
        },
      };
    });
  }

  private buildEvaluators(
    configs: EvaluatorConfig[],
    nameSuffix: string,
    toSubject: (
      params: EvaluatorParams<Example, TaskOutput>
    ) => { key: string; subject: EvaluateRequestBodyInput['subject'] } | { unavailable: string }
  ): Evaluator[] {
    const evaluationsByKey = new Map<string, Promise<EvaluateResponse>>();

    const evaluateSubject = (
      params: EvaluatorParams<Example, TaskOutput>
    ): Promise<EvaluateResponse> | { unavailable: string } => {
      const resolved = toSubject(params);
      if ('unavailable' in resolved) {
        return resolved;
      }
      const existing = evaluationsByKey.get(resolved.key);
      if (existing) {
        return existing;
      }

      const evaluation = this.evaluate({
        subject: resolved.subject,
        evaluators: configs.map(({ name, version, connectorId }) => ({
          name,
          version,
          connector_id: connectorId,
        })),
      });
      evaluationsByKey.set(resolved.key, evaluation);
      return evaluation;
    };

    return configs.flatMap((config) => {
      let resolvedModel: Model | undefined;
      let resolvedVersion = config.version;

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
        name: `${name}${nameSuffix}`,
        kind: config.kind,
        direction: config.direction,
        getModel: () => resolvedModel,
        getVersion: () => resolvedVersion,
        evaluate: async (params) => {
          try {
            const evaluation = evaluateSubject(params);
            if ('unavailable' in evaluation) {
              return { score: null, label: 'unavailable', explanation: evaluation.unavailable };
            }
            const result = await evaluation;
            const item = result.results.find((entry) => entry.evaluator.name === config.name);
            if (!item) {
              throw new Error(`No evaluation result returned for "${config.name}"`);
            }
            resolvedModel = item.evaluator.model ?? resolvedModel;
            resolvedVersion = item.evaluator.version;
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

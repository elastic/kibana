/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BoundInferenceClient, ShortIdTable } from '@kbn/inference-common';
import { ToolingLog } from '@kbn/tooling-log';
import { sumBy, uniqBy } from 'lodash';
import pRetry from 'p-retry';
import { Evaluator } from '../../types';
import { LlmCriteriaEvaluationPrompt } from './prompt';

type EvaluationCriterionText = string;

export interface EvaluationCriterionStructured {
  id: string;
  text: string;
  score?: number;
}

export type EvaluationCriterion = EvaluationCriterionStructured | EvaluationCriterionText;

export function createCriteriaEvaluator({
  inferenceClient,
  criteria,
  log,
}: {
  inferenceClient: BoundInferenceClient;
  criteria?: EvaluationCriterion[];
  log: ToolingLog;
}): Evaluator {
  const table = new ShortIdTable();

  const structuredCriteria =
    criteria?.map((criterion) => {
      if (typeof criterion === 'string') {
        return {
          id: table.take(criterion),
          text: criterion,
          score: 1,
        };
      }

      return {
        id: criterion.id,
        text: criterion.text,
        score: criterion.score ?? 1,
      };
    }) ?? [];

  const criteriaById = new Map(structuredCriteria.map((criterion) => [criterion.id, criterion]));

  return {
    evaluate: async ({ input, output }) => {
      async function scoreTask() {
        const response = await inferenceClient.prompt({
          prompt: LlmCriteriaEvaluationPrompt,
          input: {
            input: JSON.stringify(input),
            output: JSON.stringify(output),
            criteria: structuredCriteria.map((criterion) => {
              return `${criterion.id}: ${criterion.text}`;
            }),
          },
        });

        const evaluations = uniqBy(
          response.toolCalls.flatMap((toolCall) => toolCall.function.arguments.criteria),
          (criterion) => criterion.id
        );

        return evaluations.map((evaluation) => {
          const criterion = criteriaById.get(evaluation.id);
          if (!criterion) {
            throw new Error(`Could not find criterion for id "${evaluation.id}"`);
          }

          return {
            criterion,
            evaluation,
          };
        });
      }

      const results = await pRetry(scoreTask, {
        retries: 0,
        onFailedAttempt: (error) => {
          log.error(new Error(`Failed to score task`, { cause: error }));
        },
      });

      function normalize(val: number) {
        if (!isFinite(val)) {
          return 0;
        }
        return val;
      }

      const maxScore = sumBy(structuredCriteria, (criterion) => criterion.score);

      const successful = results.filter(({ evaluation }) => evaluation.result === 'PASS');
      const failed = results.filter(({ evaluation }) => evaluation.result === 'FAIL');
      const notApplicable = results.filter(({ evaluation }) => evaluation.result === 'N/A');

      const totalScore = sumBy(
        successful.concat(notApplicable),
        ({ criterion }) => criterion.score
      );

      return {
        explanation: results
          .map(({ evaluation, criterion }) => {
            return `"${criterion.id}": ${evaluation.reason ?? 'No explanation given'}`;
          })
          .join('\n'),
        label: null,
        metadata: {
          successful: sumBy(successful, ({ criterion }) => criterion.score),
          failed: sumBy(failed, ({ criterion }) => criterion.score),
          not_applicable: sumBy(notApplicable, ({ criterion }) => criterion.score),
        },
        score: normalize(totalScore / maxScore),
      };
    },
    kind: 'LLM',
    name: 'criteria',
  };
}

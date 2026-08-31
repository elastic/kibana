/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateQuery } from '@kbn/esql-language';
import type { Evaluator, EvaluationResult, Example, TaskOutput } from '@kbn/evals';

export const ESQL_VALIDITY_EVALUATOR_NAME = 'ES|QL Validity';

interface QueryValidationDetail {
  query: string;
  valid: boolean;
  errors: string[];
}

/**
 * CODE evaluator: syntax-checks ES|QL via `@kbn/esql-language` (no LLM, no infra).
 * `scoreOnEmptyQueries` defaults to `1` — nothing to validate means nothing is invalid.
 */
export function createEsqlValidityEvaluator<
  TExample extends Example = Example,
  TTaskOutput extends TaskOutput = TaskOutput
>(config: {
  queryExtractor: (output: TTaskOutput) => string[];
  scoreOnEmptyQueries?: number;
  name?: string;
}): Evaluator<TExample, TTaskOutput> {
  const { queryExtractor, scoreOnEmptyQueries = 1, name = ESQL_VALIDITY_EVALUATOR_NAME } = config;

  return {
    name,
    kind: 'CODE',
    direction: 'maximize',
    evaluate: async ({ output }): Promise<EvaluationResult> => {
      let queries: string[];

      try {
        queries = queryExtractor(output);
      } catch (err) {
        return {
          score: 0,
          label: 'error',
          explanation: `Query extractor threw: ${(err as Error).message}`,
        };
      }

      if (queries.length === 0) {
        return {
          score: scoreOnEmptyQueries,
          label: 'no-queries',
          explanation: 'No ES|QL queries found in output — nothing to validate.',
        };
      }

      const details = await Promise.all(
        queries.map(async (query): Promise<QueryValidationDetail> => {
          if (!query || typeof query !== 'string' || query.trim().length === 0) {
            return { query: query ?? '', valid: false, errors: ['Empty or non-string query'] };
          }

          const { errors } = await validateQuery(query);
          const errorMessages = errors.map((e) =>
            'text' in e ? e.text : 'message' in e ? (e as { message: string }).message : String(e)
          );
          return { query, valid: errorMessages.length === 0, errors: errorMessages };
        })
      );

      const invalidQueries = details.filter((d) => !d.valid);
      const allValid = invalidQueries.length === 0;

      const noun = details.length === 1 ? 'query' : 'queries';
      const explanation = allValid
        ? `All ${details.length} ES|QL ${
            details.length === 1 ? 'query is' : 'queries are'
          } syntactically valid.`
        : [
            `${invalidQueries.length} of ${details.length} ES|QL ${noun} failed validation:`,
            ...invalidQueries.map((d) => `  • "${truncate(d.query, 80)}": ${d.errors.join('; ')}`),
          ].join('\n');

      return {
        score: allValid ? 1 : 0,
        label: allValid ? 'valid' : 'invalid',
        explanation,
        metadata: {
          totalQueries: details.length,
          validCount: details.length - invalidQueries.length,
          invalidCount: invalidQueries.length,
          queries: details,
        },
      };
    },
  };
}

function truncate(str: string, maxLen: number): string {
  const oneLine = str.replace(/\n/g, ' ').trim();
  return oneLine.length <= maxLen ? oneLine : `${oneLine.slice(0, maxLen - 3)}...`;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateQuery } from '@kbn/esql-language';
import type { Evaluator, EvaluationResult, Example, TaskOutput } from '../../types';

/**
 * Default evaluator name. Title case is the convention for evaluators registered
 * in `@kbn/evals` and surfaced in eval reports.
 */
export const ESQL_VALIDITY_EVALUATOR_NAME = 'ES|QL Validity';

interface QueryValidationDetail {
  query: string;
  valid: boolean;
  errors: string[];
}

/**
 * Deterministic evaluator that validates ES|QL strings using the
 * `@kbn/esql-language` parser. No LLM call — runs `validateQuery`
 * without callbacks so only syntax / AST errors are flagged (field
 * and source resolution are intentionally skipped).
 *
 * Returns score 1.0 when every extracted query is syntactically valid,
 * 0.0 when at least one query contains a parse error.
 *
 * Per-query parsing runs concurrently via `Promise.all`, so total latency
 * scales with the slowest query rather than the sum of all queries.
 *
 * ### Empty-output behavior
 *
 * The default `scoreOnEmptyQueries` is `1`: if the extractor returns an empty
 * array, the evaluator scores 1.0 with label `valid` ("nothing to validate
 * means nothing is invalid"). This is intentionally different from
 * {@link createEsqlExecutionEvaluator}, which scores 0 by default for empty
 * output (because in execution contexts, missing queries usually mean the
 * task failed). Set this option explicitly when neither default fits.
 *
 * @param config.queryExtractor - extracts ES|QL strings from the task output.
 *   Must return an array.
 * @param config.scoreOnEmptyQueries - Score returned when the extractor yields
 *   no queries. Defaults to `1`.
 * @param config.name - Override the evaluator name (defaults to
 *   `ES|QL Validity`).
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

      const explanation = allValid
        ? `All ${details.length} ES|QL ${pluralize(
            'query',
            details.length,
            'is',
            'queries',
            'are'
          )} syntactically valid.`
        : [
            `${invalidQueries.length} of ${details.length} ES|QL ${pluralize(
              'query',
              details.length,
              undefined,
              'queries'
            )} failed validation:`,
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
  return oneLine.length <= maxLen ? oneLine : oneLine.slice(0, maxLen - 3) + '...';
}

function pluralize(
  singular: string,
  count: number,
  singularVerb?: string,
  plural?: string,
  pluralVerb?: string
): string {
  const noun = count === 1 ? singular : plural ?? `${singular}s`;
  const verb = count === 1 ? singularVerb : pluralVerb;
  return verb ? `${noun} ${verb}` : noun;
}

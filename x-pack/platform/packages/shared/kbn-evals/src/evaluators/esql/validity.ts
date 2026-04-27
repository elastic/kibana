/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateQuery } from '@kbn/esql-language';
import type { Evaluator, EvaluationResult } from '../../types';

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
 * @param config.queryExtractor - extracts ES|QL strings from the task output.
 *   Must return an array; empty arrays score 1.0 (nothing to validate).
 */
export function createEsqlValidityEvaluator(config: {
  queryExtractor: (output: unknown) => string[];
}): Evaluator {
  const { queryExtractor } = config;

  return {
    name: ESQL_VALIDITY_EVALUATOR_NAME,
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
          score: 1,
          label: 'valid',
          explanation: 'No ES|QL queries found in output — nothing to validate.',
        };
      }

      const details: QueryValidationDetail[] = [];

      for (const query of queries) {
        if (!query || typeof query !== 'string' || query.trim().length === 0) {
          details.push({ query: query ?? '', valid: false, errors: ['Empty or non-string query'] });
          continue;
        }

        const { errors } = await validateQuery(query);
        const errorMessages = errors.map((e) =>
          'text' in e ? e.text : 'message' in e ? (e as { message: string }).message : String(e)
        );
        details.push({ query, valid: errorMessages.length === 0, errors: errorMessages });
      }

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
          details,
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

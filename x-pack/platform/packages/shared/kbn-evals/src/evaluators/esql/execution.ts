/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateQuery } from '@kbn/esql-language';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type {
  Evaluator,
  EvaluationResult,
  EvaluatorParams,
  Example,
  TaskOutput,
} from '../../types';

export const ESQL_EXECUTION_EVALUATOR_NAME = 'ES|QL Execution Validity';

interface QueryExecutionDetail {
  query: string;
  astValid: boolean;
  executionValid: boolean;
  hasHits: boolean;
  astError?: string;
  executionError?: string;
}

/**
 * Resolves the per-example decision of whether to score hit-rate as part of
 * the composite. Either a static boolean or a function that inspects the
 * evaluator params (so callers can opt in via dataset metadata).
 */
type IncludeHitDetection<TExample extends Example, TTaskOutput extends TaskOutput> =
  | boolean
  | ((params: EvaluatorParams<TExample, TTaskOutput>) => boolean);

function extractErrorMessages(errors: ReadonlyArray<unknown>): string[] {
  return errors.map((e) => {
    if (e && typeof e === 'object') {
      if ('text' in e) return (e as { text: string }).text;
      if ('message' in e) return (e as { message: string }).message;
    }
    return String(e);
  });
}

/**
 * Two- or three-tier ES|QL execution evaluator (CODE-kind, deterministic).
 *
 * Tiers (each contributes one component to the composite score):
 * 1. **AST parse** via `@kbn/esql-language` `validateQuery` — catches pure
 *    syntax errors (no field/source resolution, no LLM call).
 * 2. **ES execution** via `esClient.esql.query` — catches runtime errors
 *    (unknown fields, invalid functions, type mismatches, etc.) by running
 *    each query against the live cluster.
 * 3. **Hit detection** (optional) — fraction of queries that returned ≥1 row.
 *    Useful when the dataset asserts that queries should match real data.
 *
 * The final score is the unweighted mean of the included tiers.
 *
 * Unlike {@link createEsqlValidityEvaluator} (syntax-only, no infra needed),
 * this evaluator requires an `ElasticsearchClient` because it actually runs
 * each query. Use the validity evaluator when you only want a fast, offline
 * structural check, and use this one when you also want to verify the queries
 * are runnable against your dataset.
 *
 * @param config.esClient - Elasticsearch client used to execute each query.
 * @param config.queryExtractor - Extracts ES|QL strings from the task output.
 * @param config.includeHitDetection - When `true`, adds hit-rate as a third
 *   scoring component. Can also be a function that decides per-example based
 *   on the evaluator params (e.g. dataset metadata).
 * @param config.logger - Optional logger for execution failures.
 * @param config.name - Override the evaluator name (defaults to
 *   `ES|QL Execution Validity`). Useful for preserving stable evaluator
 *   identity in existing eval reports.
 */
export function createEsqlExecutionEvaluator<
  TExample extends Example = Example,
  TTaskOutput extends TaskOutput = TaskOutput
>(config: {
  esClient: ElasticsearchClient;
  queryExtractor: (output: TTaskOutput) => string[];
  includeHitDetection?: IncludeHitDetection<TExample, TTaskOutput>;
  logger?: Logger;
  name?: string;
}): Evaluator<TExample, TTaskOutput> {
  const {
    esClient,
    queryExtractor,
    includeHitDetection = false,
    logger,
    name = ESQL_EXECUTION_EVALUATOR_NAME,
  } = config;

  return {
    name,
    kind: 'CODE',
    evaluate: async (params): Promise<EvaluationResult> => {
      let queries: string[];

      try {
        queries = queryExtractor(params.output);
      } catch (err) {
        return {
          score: 0,
          label: 'error',
          explanation: `Query extractor threw: ${(err as Error).message}`,
        };
      }

      if (queries.length === 0) {
        return {
          score: 0,
          label: 'no-queries',
          explanation: 'No ES|QL queries found in output.',
        };
      }

      const includeHits =
        typeof includeHitDetection === 'function'
          ? includeHitDetection(params)
          : includeHitDetection;

      const details: QueryExecutionDetail[] = [];
      let astValidCount = 0;
      let executionValidCount = 0;
      let hitCount = 0;

      for (const query of queries) {
        const detail: QueryExecutionDetail = {
          query: typeof query === 'string' ? query : '',
          astValid: false,
          executionValid: false,
          hasHits: false,
        };

        if (!query || typeof query !== 'string' || query.trim().length === 0) {
          detail.astError = 'Empty or non-string query';
          details.push(detail);
          continue;
        }

        const { errors } = await validateQuery(query);
        if (errors.length === 0) {
          detail.astValid = true;
          astValidCount++;
        } else {
          detail.astError = extractErrorMessages(errors).join('; ');
        }

        try {
          const result = await esClient.esql.query({ query });
          detail.executionValid = true;
          executionValidCount++;
          if (result.values && result.values.length > 0) {
            detail.hasHits = true;
            hitCount++;
          }
        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          detail.executionError = errorMessage;
          logger?.warn(`ES|QL execution failed for "${query}": ${errorMessage}`);
        }

        details.push(detail);
      }

      const astSyntaxValidityRate = astValidCount / queries.length;
      const executionSuccessRate = executionValidCount / queries.length;
      const executionHitRate = hitCount / queries.length;

      const scoreComponents = [astSyntaxValidityRate, executionSuccessRate];
      if (includeHits) {
        scoreComponents.push(executionHitRate);
      }
      const score =
        scoreComponents.reduce((sum, component) => sum + component, 0) / scoreComponents.length;

      const issues: string[] = [];
      if (astValidCount < queries.length) {
        issues.push(
          `${queries.length - astValidCount}/${queries.length} queries have AST parse errors`
        );
      }
      if (executionValidCount < queries.length) {
        issues.push(
          `${queries.length - executionValidCount}/${queries.length} queries failed ES execution`
        );
      }
      if (includeHits && hitCount < queries.length) {
        issues.push(`${queries.length - hitCount}/${queries.length} queries returned no hits`);
      }

      const explanation =
        issues.length > 0
          ? `${issues.join('; ')} (score=${score.toFixed(2)})`
          : `All ${queries.length} ${
              queries.length === 1 ? 'query has' : 'queries have'
            } valid syntax${includeHits ? ' and return hits' : ' and execute successfully'}`;

      return {
        score,
        label:
          score === 1
            ? 'valid'
            : astValidCount === 0
            ? 'syntax-error'
            : executionValidCount === 0
            ? 'execution-error'
            : 'partial',
        explanation,
        details: {
          astSyntaxValidityRate,
          executionSuccessRate,
          executionHitRate,
          includesHitRate: includeHits,
          queries: details,
        },
      };
    },
  };
}

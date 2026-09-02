/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateQuery } from '@kbn/esql-language';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { Evaluator, EvaluationResult, Example, TaskOutput } from '@kbn/evals';
import { substituteEsqlBindParams } from './esql_bind_params';

export const ESQL_EXECUTION_EVALUATOR_NAME = 'ES|QL Execution Validity';

interface QueryExecutionDetail {
  query: string;
  astValid: boolean;
  executionValid: boolean;
  hasHits: boolean;
  astError?: string;
  executionError?: string;
}

interface EvaluateArgs<TExample extends Example, TTaskOutput extends TaskOutput> {
  input: TExample['input'];
  output: TTaskOutput;
  expected: TExample['output'];
  metadata: TExample['metadata'];
}

/**
 * Resolves the per-example decision of whether to score hit-rate as part of
 * the composite. Either a static boolean or a function that inspects the
 * evaluator params (so callers can opt in via dataset metadata).
 */
type IncludeHitDetection<TExample extends Example, TTaskOutput extends TaskOutput> =
  | boolean
  | ((params: EvaluateArgs<TExample, TTaskOutput>) => boolean);

function extractErrorMessages(errors: ReadonlyArray<unknown>): string[] {
  return errors.map((e) => {
    if (e && typeof e === 'object') {
      if ('text' in e) return (e as { text: string }).text;
      if ('message' in e) return (e as { message: string }).message;
    }
    return String(e);
  });
}

async function evaluateSingleQuery(
  query: string,
  esClient: ElasticsearchClient,
  logger?: Logger
): Promise<QueryExecutionDetail> {
  const detail: QueryExecutionDetail = {
    query: typeof query === 'string' ? query : '',
    astValid: false,
    executionValid: false,
    hasHits: false,
  };

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    detail.astError = 'Empty or non-string query';
    return detail;
  }

  // Validate the original query (bind placeholders are syntactically valid);
  // substitute only for ES execution, which rejects `?_tstart` / `?_tend`.
  const executableQuery = substituteEsqlBindParams(query);
  const [astResult, execResult] = await Promise.allSettled([
    validateQuery(query),
    esClient.esql.query({ query: executableQuery }),
  ]);

  if (astResult.status === 'fulfilled') {
    const { errors } = astResult.value;
    if (errors.length === 0) {
      detail.astValid = true;
    } else {
      detail.astError = extractErrorMessages(errors).join('; ');
    }
  } else {
    detail.astError =
      astResult.reason instanceof Error ? astResult.reason.message : String(astResult.reason);
  }

  if (execResult.status === 'fulfilled') {
    detail.executionValid = true;
    if (execResult.value.values && execResult.value.values.length > 0) {
      detail.hasHits = true;
    }
  } else {
    const errorMessage =
      execResult.reason instanceof Error ? execResult.reason.message : String(execResult.reason);
    detail.executionError = errorMessage;
    logger?.warn(`ES|QL execution failed for "${query}": ${errorMessage}`);
  }

  return detail;
}

/**
 * Two- or three-tier CODE evaluator: AST parse → ES execution → optional hit detection.
 * Score is the unweighted mean of included tiers. Requires a live ES cluster.
 * `scoreOnEmptyQueries` defaults to `0` (no query = failed generation).
 * `includeHitDetection` can be a per-example function keyed on dataset metadata.
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
  scoreOnEmptyQueries?: number;
}): Evaluator<TExample, TTaskOutput> {
  const {
    esClient,
    queryExtractor,
    includeHitDetection = false,
    logger,
    name = ESQL_EXECUTION_EVALUATOR_NAME,
    scoreOnEmptyQueries = 0,
  } = config;

  return {
    name,
    kind: 'CODE',
    direction: 'maximize',
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
          score: scoreOnEmptyQueries,
          label: 'no-queries',
          explanation: 'No ES|QL queries found in output.',
        };
      }

      const includeHits =
        typeof includeHitDetection === 'function'
          ? includeHitDetection(params)
          : includeHitDetection;

      const details = await Promise.all(
        queries.map((query) => evaluateSingleQuery(query, esClient, logger))
      );

      const astValidCount = details.filter((d) => d.astValid).length;
      const executionValidCount = details.filter((d) => d.executionValid).length;
      const hitCount = details.filter((d) => d.hasHits).length;

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
        metadata: {
          totalQueries: queries.length,
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

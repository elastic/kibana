/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { Parser } from '@elastic/esql';
import type { KIQueryGenerationEvaluator } from '../types';
import { getQueriesFromOutput } from '../types';

interface SyntaxDetail {
  esql: string;
  astValid: boolean;
  executionValid: boolean;
  hasHits: boolean;
  astError?: string;
  executionError?: string;
}

/**
 * Two-tier ES|QL syntax validation with optional hit detection:
 * 1. AST parse via `Parser.parse()` -- catches pure syntax errors
 * 2. ES execution via `esClient.esql.query` -- catches runtime issues and
 *    records whether the query returned rows (hit detection)
 *
 * Reports sub-scores:
 * - `astSyntaxValidityRate` -- fraction of queries that parse successfully
 * - `executionSuccessRate` -- fraction of queries that execute without error
 * - `executionHitRate` -- fraction of queries returning ≥1 row (only included
 *    in the score when `failure_mode` is set in metadata)
 */
export const createSyntaxValidationEvaluator = (
  esClient: ElasticsearchClient,
  logger?: Logger
): KIQueryGenerationEvaluator => ({
  name: 'syntax_validation',
  kind: 'CODE' as const,
  evaluate: async ({ output, metadata }) => {
    const queries = getQueriesFromOutput(output);
    if (queries.length === 0) {
      return { score: 0, explanation: 'No queries generated' };
    }

    let astValidCount = 0;
    let executionValidCount = 0;
    let hitCount = 0;
    const details: SyntaxDetail[] = [];

    for (const query of queries) {
      const detail: SyntaxDetail = {
        esql: query.esql,
        astValid: false,
        executionValid: false,
        hasHits: false,
      };

      try {
        Parser.parse(query.esql);
        detail.astValid = true;
        astValidCount++;
      } catch (e) {
        detail.astError = e instanceof Error ? e.message : String(e);
      }

      try {
        const result = await esClient.esql.query({ query: query.esql });
        detail.executionValid = true;
        executionValidCount++;
        if (result.values && result.values.length > 0) {
          detail.hasHits = true;
          hitCount++;
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        detail.executionError = errorMessage;
        logger?.warn(`ES|QL execution failed for "${query.esql}": ${errorMessage}`);
      }

      details.push(detail);
    }

    const astSyntaxValidityRate = astValidCount / queries.length;
    const executionSuccessRate = executionValidCount / queries.length;
    const executionHitRate = hitCount / queries.length;
    const hasFailureMode = Boolean(metadata?.failure_mode);

    const scoreComponents = [astSyntaxValidityRate, executionSuccessRate];
    if (hasFailureMode) {
      scoreComponents.push(executionHitRate);
    }
    const score =
      scoreComponents.reduce((sum, scoreComponent) => sum + scoreComponent, 0) /
      scoreComponents.length;

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
    if (hasFailureMode && hitCount < queries.length) {
      issues.push(`${queries.length - hitCount}/${queries.length} queries returned no hits`);
    }

    return {
      score,
      explanation:
        issues.length > 0
          ? `${issues.join('; ')} (score=${score.toFixed(2)})`
          : `All ${queries.length} queries have valid syntax${
              hasFailureMode ? ' and return hits' : ' and execute successfully'
            }`,
      details: {
        astSyntaxValidityRate,
        executionSuccessRate,
        executionHitRate,
        includesHitRate: hasFailureMode,
        queries: details,
      },
    };
  },
});

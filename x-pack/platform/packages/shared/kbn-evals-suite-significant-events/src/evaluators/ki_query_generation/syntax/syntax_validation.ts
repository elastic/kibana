/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { createEsqlExecutionEvaluator } from '@kbn/evals';
import type { KIQueryGenerationEvaluator } from '../types';
import { getQueriesFromOutput } from '../types';

/**
 * Two-tier ES|QL syntax validation with optional hit detection.
 *
 * Thin domain-specific wrapper around `createEsqlExecutionEvaluator` from
 * `@kbn/evals`. Extracts ES|QL strings from the KI Query Generation task
 * output and opts in to hit detection per-example via `metadata.failure_mode`.
 *
 * The evaluator name is preserved as `syntax_validation` for backwards
 * compatibility with existing eval reports and dashboards.
 *
 * Reports sub-scores (in `result.details`):
 * - `astSyntaxValidityRate` — fraction of queries that parse successfully
 * - `executionSuccessRate` — fraction of queries that execute without error
 * - `executionHitRate` — fraction of queries returning ≥1 row (only included
 *   in the score when `failure_mode` is set in metadata)
 */
export const createSyntaxValidationEvaluator = (
  esClient: ElasticsearchClient,
  logger?: Logger
): KIQueryGenerationEvaluator =>
  createEsqlExecutionEvaluator({
    esClient,
    logger,
    name: 'syntax_validation',
    queryExtractor: (output) => getQueriesFromOutput(output).map((q) => q.esql),
    includeHitDetection: ({ metadata }) => Boolean(metadata?.failure_mode),
  }) as KIQueryGenerationEvaluator;

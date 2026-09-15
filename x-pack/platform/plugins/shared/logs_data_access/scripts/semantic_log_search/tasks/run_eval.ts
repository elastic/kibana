/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { loggerMock } from '@kbn/logging-mocks';
import type { ConnectionConfig } from '../lib/connection_config';
import { EVAL_QUERIES, matchesPattern, type EvalQuery } from '../ground_truth';
import { createSemanticLogSearchService } from '../../../server/services/semantic_log_search';
import type { LogPattern } from '../../../common/services/semantic_log_search/types';

interface RunEvalParams {
  esClient: Client;
  config: ConnectionConfig;
  log: ToolingLog;
}

interface EvalResult {
  queryId: string;
  kind: 'semantic' | 'literal';
  pAt10: number;
  recall: number;
  distinctMessages: number;
  relevantInTop10: number;
  hardNegativesInTop10: number;
  totalRelevant: number;
}

/**
 * Calculate P@10: precision in top 10 results.
 */
function calculatePrecisionAt10(
  patterns: LogPattern[],
  relevantPatterns: string[],
  hardNegatives: string[]
): { pAt10: number; relevantInTop10: number; hardNegativesInTop10: number } {
  const top10 = patterns.slice(0, 10);
  let relevantCount = 0;
  let hardNegativeCount = 0;

  for (const pattern of top10) {
    const message = pattern.sample?.message as string | undefined;
    if (message) {
      if (matchesPattern(message, relevantPatterns)) {
        relevantCount++;
      }
      if (matchesPattern(message, hardNegatives)) {
        hardNegativeCount++;
      }
    }
  }

  return {
    pAt10: relevantCount / Math.min(10, top10.length),
    relevantInTop10: relevantCount,
    hardNegativesInTop10: hardNegativeCount,
  };
}

/**
 * Calculate recall: fraction of relevant patterns found.
 */
function calculateRecall(patterns: LogPattern[], relevantPatterns: string[]): number {
  const foundPatterns = new Set<string>();

  for (const pattern of patterns) {
    const message = pattern.sample?.message as string | undefined;
    if (message) {
      for (const rel of relevantPatterns) {
        if (message.includes(rel)) {
          foundPatterns.add(rel);
        }
      }
    }
  }

  return foundPatterns.size / relevantPatterns.length;
}

/**
 * Count distinct message types in results.
 */
function countDistinctMessages(patterns: LogPattern[]): number {
  // Each pattern is already a distinct message type
  return patterns.length;
}

/**
 * Run evaluation for a single query.
 */
async function evaluateQuery(
  query: EvalQuery,
  esClient: Client,
  target: string,
  log: ToolingLog
): Promise<EvalResult> {
  // Create the service (note: we pass a mock RegisterServicesParams since we're using esClient directly)
  const service = createSemanticLogSearchService({
    logger: loggerMock.create(),
    deps: {
      savedObjects: {} as any,
      uiSettings: {} as any,
    },
  });

  // Get time range (last 24 hours as a reasonable default)
  const now = Date.now();
  const timeRange = {
    start: now - 24 * 60 * 60 * 1000,
    end: now,
  };

  log.info(`  Evaluating: ${query.id} (${query.kind})`);
  log.debug(`    Query: "${query.query}"`);

  // Run search
  const result = await service.search({
    esClient: esClient as any, // Client is compatible with ElasticsearchClient for our purposes
    target,
    nlQuery: query.query,
    timeRange,
    maxPatterns: 20,
  });

  const patterns = result.patterns;
  log.debug(`    Found ${patterns.length} patterns`);

  // Calculate metrics
  const { pAt10, relevantInTop10, hardNegativesInTop10 } = calculatePrecisionAt10(
    patterns,
    query.relevant,
    query.hardNegatives
  );
  const recall = calculateRecall(patterns, query.relevant);
  const distinctMessages = countDistinctMessages(patterns);

  return {
    queryId: query.id,
    kind: query.kind,
    pAt10,
    recall,
    distinctMessages,
    relevantInTop10,
    hardNegativesInTop10,
    totalRelevant: query.relevant.length,
  };
}

/**
 * Run retrieval evaluation against the service.
 *
 * Metrics:
 * - P@10: Precision in top 10 results
 * - Recall: Fraction of relevant patterns found
 * - Distinct messages: Number of unique message types in results
 */
export async function runEval({ esClient, config, log }: RunEvalParams): Promise<void> {
  const target = config.targetDataStream;

  log.info(`Running evaluation against: ${target}`);
  log.info(`Evaluating ${EVAL_QUERIES.length} queries`);

  const results: EvalResult[] = [];

  for (const query of EVAL_QUERIES) {
    try {
      const result = await evaluateQuery(query, esClient, target, log);
      results.push(result);
    } catch (error) {
      log.error(`  Error evaluating ${query.id}: ${error}`);
    }
  }

  // Print results table
  log.info('\n--- Evaluation Results ---\n');
  log.info('| Query | Kind | P@10 | Recall | Distinct | Relevant | Hard Neg |');
  log.info('|-------|------|------|--------|----------|----------|----------|');

  for (const result of results) {
    log.info(
      `| ${result.queryId.padEnd(20)} | ${result.kind.padEnd(8)} | ` +
        `${result.pAt10.toFixed(2).padStart(4)} | ${result.recall.toFixed(2).padStart(6)} | ` +
        `${String(result.distinctMessages).padStart(8)} | ` +
        `${String(result.relevantInTop10).padStart(8)} | ` +
        `${String(result.hardNegativesInTop10).padStart(8)} |`
    );
  }

  // Summary statistics
  const semanticQueries = results.filter((r) => r.kind === 'semantic');
  const literalQueries = results.filter((r) => r.kind === 'literal');

  if (semanticQueries.length > 0) {
    const avgSemanticP10 =
      semanticQueries.reduce((sum, r) => sum + r.pAt10, 0) / semanticQueries.length;
    const avgSemanticRecall =
      semanticQueries.reduce((sum, r) => sum + r.recall, 0) / semanticQueries.length;
    log.info(`\nSemantic queries (n=${semanticQueries.length}):`);
    log.info(`  Avg P@10: ${avgSemanticP10.toFixed(3)}`);
    log.info(`  Avg Recall: ${avgSemanticRecall.toFixed(3)}`);
  }

  if (literalQueries.length > 0) {
    const avgLiteralP10 =
      literalQueries.reduce((sum, r) => sum + r.pAt10, 0) / literalQueries.length;
    const avgLiteralRecall =
      literalQueries.reduce((sum, r) => sum + r.recall, 0) / literalQueries.length;
    log.info(`\nLiteral queries (n=${literalQueries.length}):`);
    log.info(`  Avg P@10: ${avgLiteralP10.toFixed(3)}`);
    log.info(`  Avg Recall: ${avgLiteralRecall.toFixed(3)}`);
  }

  // Check for regressions
  const hasRegressions = results.some(
    (r) => r.kind === 'literal' && r.pAt10 < 1.0 && r.totalRelevant > 0
  );
  if (hasRegressions) {
    log.warning('Literal queries should have P@10 = 1.0 - check for regression');
  }

  const hasHardNegatives = results.some((r) => r.hardNegativesInTop10 > 0);
  if (hasHardNegatives) {
    log.warning('Hard negatives found in top 10 results - semantic ranking may need improvement');
  }
}

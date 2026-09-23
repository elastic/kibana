/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { EvaluationResult, Evaluator, Example, TaskOutput } from '@kbn/evals';
import { createEsqlQueryRunner, type EsqlQueryRunner } from './esql_query_runner';
import { normalizeEsqlForEquivalence } from './normalize_esql_for_equivalence';

export const ESQL_RESULT_EQUIVALENCE_EVALUATOR_NAME = 'ES|QL Result Equivalence';

export interface RowNormalizeOptions {
  /** Decimal places numeric values are rounded to; absorbs aggregation precision drift. */
  floatTolerance?: number;
}

const roundValue = (value: unknown, floatTolerance: number): unknown =>
  typeof value === 'number' ? parseFloat(value.toFixed(floatTolerance)) : value;

/**
 * Serialises each row as a sorted bag of its values. Column names are dropped
 * because gold and candidate alias their STATS outputs differently, and column
 * order is dropped because `STATS a, b` and `STATS b, a` draw the same chart.
 */
export function normalizeRows(values: unknown[][], options: RowNormalizeOptions = {}): string[] {
  const { floatTolerance = 2 } = options;
  return values
    .map((row) =>
      JSON.stringify(row.map((value) => JSON.stringify(roundValue(value, floatTolerance))).sort())
    )
    .sort();
}

export interface RowMultisetComparison {
  intersectionSize: number;
  unionSize: number;
  jaccard: number;
}

/** Multiset Jaccard over serialised rows; two empty result sets count as identical. */
export function compareRowMultisets(
  goldRows: string[],
  candidateRows: string[]
): RowMultisetComparison {
  if (goldRows.length === 0 && candidateRows.length === 0) {
    return { intersectionSize: 0, unionSize: 0, jaccard: 1 };
  }
  const count = (rows: string[]) =>
    rows.reduce((map, row) => map.set(row, (map.get(row) ?? 0) + 1), new Map<string, number>());
  const goldCounts = count(goldRows);
  const candidateCounts = count(candidateRows);

  let intersectionSize = 0;
  for (const [row, goldCount] of goldCounts) {
    intersectionSize += Math.min(goldCount, candidateCounts.get(row) ?? 0);
  }
  const unionSize = goldRows.length + candidateRows.length - intersectionSize;
  return {
    intersectionSize,
    unionSize,
    jaccard: unionSize === 0 ? 1 : intersectionSize / unionSize,
  };
}

const labelFromScore = (score: number): string =>
  score === 1 ? 'exact-match' : score === 0 ? 'no-overlap' : 'partial-match';

const errorMessage = (reason: unknown): string =>
  reason instanceof Error ? reason.message : String(reason);

/**
 * CODE evaluator: executes the gold and candidate ES|QL (with the optional
 * time-picker WHERE stripped from both) and scores the Jaccard overlap of
 * their result rows. Sits between "the query runs" and the LLM
 * equivalence judge: a candidate that groups by the wrong field or drops a
 * filter produces different rows no matter how plausible it reads.
 */
export function createEsqlResultEquivalenceEvaluator<
  TExample extends Example = Example,
  TTaskOutput extends TaskOutput = TaskOutput
>(config: {
  esClient: ElasticsearchClient;
  predictionExtractor: (output: TTaskOutput) => string;
  groundTruthExtractor: (expected: TExample['output']) => string;
  normalize?: RowNormalizeOptions;
  name?: string;
  /** Shared runner so evaluators that execute the same query hit ES once. */
  runQuery?: EsqlQueryRunner;
}): Evaluator<TExample, TTaskOutput> {
  const {
    esClient,
    runQuery = createEsqlQueryRunner(esClient),
    predictionExtractor,
    groundTruthExtractor,
    normalize = {},
    name = ESQL_RESULT_EQUIVALENCE_EVALUATOR_NAME,
  } = config;

  return {
    name,
    kind: 'CODE',
    direction: 'maximize',
    evaluate: async ({ output, expected }): Promise<EvaluationResult> => {
      const candidateQuery = predictionExtractor(output);
      const goldQuery = groundTruthExtractor(expected);

      if (!goldQuery) {
        return {
          score: null,
          label: 'skipped',
          explanation: 'No gold query declared for this example.',
        };
      }
      if (!candidateQuery) {
        return {
          score: 0,
          label: 'no-visualization',
          explanation: 'No candidate query produced to compare result sets.',
        };
      }

      // The suite treats the time-picker WHERE as cosmetic (the chart supplies the
      // window), so strip it from both sides before executing, as the LLM judge does.
      const [goldResult, candidateResult] = await Promise.allSettled([
        runQuery(normalizeEsqlForEquivalence(goldQuery)),
        runQuery(normalizeEsqlForEquivalence(candidateQuery)),
      ]);

      if (goldResult.status === 'rejected') {
        // A gold that does not run is a dataset bug, not a model failure; abstain loudly.
        return {
          score: null,
          label: 'gold-execution-failure',
          explanation: `Gold query failed to execute: ${errorMessage(goldResult.reason)}`,
          metadata: { goldQuery, candidateQuery },
        };
      }
      if (candidateResult.status === 'rejected') {
        return {
          score: 0,
          label: 'execution-failure',
          explanation: `Candidate query failed to execute: ${errorMessage(candidateResult.reason)}`,
          metadata: { goldQuery, candidateQuery },
        };
      }

      const goldRows = normalizeRows(goldResult.value.values ?? [], normalize);
      const candidateRows = normalizeRows(candidateResult.value.values ?? [], normalize);
      const { intersectionSize, jaccard } = compareRowMultisets(goldRows, candidateRows);

      return {
        score: jaccard,
        label: labelFromScore(jaccard),
        explanation:
          jaccard === 1
            ? `Result sets are identical (${goldRows.length} rows).`
            : `${intersectionSize} of ${Math.max(
                goldRows.length,
                candidateRows.length
              )} rows overlap (gold ${goldRows.length}, candidate ${candidateRows.length}).`,
        metadata: {
          goldRowCount: goldRows.length,
          candidateRowCount: candidateRows.length,
          intersectionRowCount: intersectionSize,
          jaccard,
          goldQuery,
          candidateQuery,
        },
      };
    },
  };
}

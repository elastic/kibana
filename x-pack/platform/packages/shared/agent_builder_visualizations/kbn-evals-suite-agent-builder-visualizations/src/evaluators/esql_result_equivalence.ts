/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationResult, Evaluator, Example, TaskOutput } from '@kbn/evals';
import type { EsqlQueryRunner } from './esql_query_runner';
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

interface CandidateComparison {
  candidateQuery: string;
  jaccard: number;
  candidateRowCount: number;
  intersectionRowCount: number;
  error?: string;
}

const describeComparison = (comparison: CandidateComparison, goldRowCount: number): string => {
  if (comparison.error !== undefined) {
    return `Candidate query failed to execute: ${comparison.error}`;
  }
  const { jaccard, intersectionRowCount, candidateRowCount } = comparison;
  return jaccard === 1
    ? `Result sets are identical (${goldRowCount} rows).`
    : `${intersectionRowCount} of ${Math.max(
        goldRowCount,
        candidateRowCount
      )} rows overlap (gold ${goldRowCount}, candidate ${candidateRowCount}).`;
};

/**
 * CODE evaluator: executes the gold and each candidate ES|QL (with the optional
 * time-picker WHERE stripped from all of them) and scores the mean Jaccard
 * overlap of their result rows, one candidate per produced visualization.
 * Sits between "the query runs" and the LLM equivalence judge: a candidate
 * that groups by the wrong field or drops a filter produces different rows no
 * matter how plausible it reads.
 */
export function createEsqlResultEquivalenceEvaluator<
  TExample extends Example = Example,
  TTaskOutput extends TaskOutput = TaskOutput
>(config: {
  /** Executes ES|QL; share one runner across evaluators so each query runs once. */
  runQuery: EsqlQueryRunner;
  /** One query per produced visualization; each is executed and compared on its own. */
  predictionExtractor: (output: TTaskOutput) => string[];
  groundTruthExtractor: (expected: TExample['output']) => string;
  normalize?: RowNormalizeOptions;
  name?: string;
}): Evaluator<TExample, TTaskOutput> {
  const {
    runQuery,
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
      const candidateQueries = predictionExtractor(output).filter((query) => query.length > 0);
      const goldQuery = groundTruthExtractor(expected);

      if (!goldQuery) {
        return {
          score: null,
          label: 'skipped',
          explanation: 'No gold query declared for this example.',
        };
      }
      if (candidateQueries.length === 0) {
        return {
          score: 0,
          label: 'no-visualization',
          explanation: 'No candidate query produced to compare result sets.',
        };
      }

      // The suite treats the time-picker WHERE as cosmetic (the chart supplies the
      // window), so strip it from every side before executing, as the LLM judge does.
      const [goldResult, ...candidateResults] = await Promise.allSettled([
        runQuery(normalizeEsqlForEquivalence(goldQuery)),
        ...candidateQueries.map((query) => runQuery(normalizeEsqlForEquivalence(query))),
      ]);

      if (goldResult.status === 'rejected') {
        // A gold that does not run is a dataset bug, not a model failure; abstain loudly.
        return {
          score: null,
          label: 'gold-execution-failure',
          explanation: `Gold query failed to execute: ${errorMessage(goldResult.reason)}`,
          metadata: { goldQuery, candidateQueries },
        };
      }

      const goldRows = normalizeRows(goldResult.value.values ?? [], normalize);
      const comparisons = candidateResults.map((result, index): CandidateComparison => {
        const candidateQuery = candidateQueries[index];
        if (result.status === 'rejected') {
          return {
            candidateQuery,
            jaccard: 0,
            candidateRowCount: 0,
            intersectionRowCount: 0,
            error: errorMessage(result.reason),
          };
        }
        const candidateRows = normalizeRows(result.value.values ?? [], normalize);
        const { intersectionSize, jaccard } = compareRowMultisets(goldRows, candidateRows);
        return {
          candidateQuery,
          jaccard,
          candidateRowCount: candidateRows.length,
          intersectionRowCount: intersectionSize,
        };
      });

      const score =
        comparisons.reduce((sum, comparison) => sum + comparison.jaccard, 0) / comparisons.length;
      const allFailed = comparisons.every((comparison) => comparison.error !== undefined);

      return {
        score,
        label: allFailed ? 'execution-failure' : labelFromScore(score),
        explanation: comparisons
          .map((comparison) => describeComparison(comparison, goldRows.length))
          .join(' '),
        metadata: {
          goldRowCount: goldRows.length,
          goldQuery,
          candidates: comparisons,
        },
      };
    },
  };
}

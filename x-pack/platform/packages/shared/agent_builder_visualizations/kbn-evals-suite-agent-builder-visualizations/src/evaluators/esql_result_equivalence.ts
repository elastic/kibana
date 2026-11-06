/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@elastic/esql';
import type { EvaluationResult, Evaluator, Example, TaskOutput } from '@kbn/evals';
import { skippedResult } from '../evaluator_utils';
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
 * Rows are compared whole by design: a candidate with one extra or missing
 * column shares no row with the gold and scores 0. Partial credit for a
 * nearly right query comes from Config vs Intent and the equivalence judge.
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

interface SortedLimit {
  limit: number;
  /** Result column names of the SORT keys; `undefined` when a key is an expression. */
  sortColumns: string[] | undefined;
  location: { min: number; max: number };
}

interface LimitAnalysis {
  unordered: boolean;
  sorted?: SortedLimit;
}

const sortKeyColumn = (arg: unknown): string | undefined => {
  if (typeof arg !== 'object' || arg === null) {
    return undefined;
  }
  const node = arg as { type?: string; name?: string; args?: unknown[] };
  if (node.type === 'column') {
    return node.name;
  }
  return node.type === 'order' ? sortKeyColumn(node.args?.[0]) : undefined;
};

/**
 * Finds the LIMIT that cuts the final rows. It is unordered when no SORT has
 * ordered the rows since the last STATS (or the source), so which rows survive
 * is up to Elasticsearch; otherwise it records the SORT keys it cuts through.
 */
function analyzeLimit(query: string): LimitAnalysis {
  let sortColumns: string[] | undefined | null = null;
  let analysis: LimitAnalysis = { unordered: false };
  for (const { name, args, location } of Parser.parse(query).root.commands) {
    if (name === 'stats') {
      sortColumns = null;
    } else if (name === 'sort') {
      const columns = args.map(sortKeyColumn);
      sortColumns = columns.every((column): column is string => column !== undefined)
        ? columns
        : undefined;
    } else if (name === 'limit') {
      if (sortColumns === null) {
        return { unordered: true };
      }
      const [limitArg] = args as Array<{ value?: unknown }>;
      if (typeof limitArg?.value === 'number') {
        analysis = { unordered: false, sorted: { limit: limitArg.value, sortColumns, location } };
      }
    }
  }
  return analysis;
}

/**
 * True when the sorted LIMIT cuts through rows that tie on every SORT key, so
 * which of the tied rows make the cut is arbitrary. Checked by re-running the
 * gold with one extra row and comparing the keys either side of the cutoff.
 */
async function limitCutsThroughTie(
  query: string,
  goldRowCount: number,
  { limit, sortColumns, location }: SortedLimit,
  runQuery: EsqlQueryRunner
): Promise<boolean> {
  if (goldRowCount < limit || sortColumns === undefined) {
    return false;
  }
  const probeQuery = `${query.slice(0, location.min)}LIMIT ${limit + 1}${query.slice(
    location.max + 1
  )}`;
  try {
    const { columns = [], values = [] } = await runQuery(probeQuery);
    if (values.length <= limit) {
      return false;
    }
    const keyIndexes = sortColumns.map((column) =>
      columns.findIndex(({ name }) => name.replace(/`/g, '') === column)
    );
    if (keyIndexes.some((index) => index < 0)) {
      return false;
    }
    const lastKept = values[limit - 1];
    const firstCut = values[limit];
    return keyIndexes.every((index) => lastKept[index] === firstCut[index]);
  } catch {
    return false;
  }
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
        return skippedResult('No gold query declared for this example.');
      }
      const normalizedGold = normalizeEsqlForEquivalence(goldQuery, { anyTimeField: true });
      const goldLimit = analyzeLimit(normalizedGold);
      if (goldLimit.unordered) {
        return skippedResult(
          'Gold query truncates with LIMIT but no SORT; its result rows are not deterministic.'
        );
      }
      if (candidateQueries.length === 0) {
        return {
          score: 0,
          label: 'no-visualization',
          explanation: 'No candidate query produced to compare result sets.',
        };
      }

      // Row overlap is compared over the whole fixture, so strip the time-picker WHERE
      // on any date field from every side before executing. Whether a non-@timestamp
      // query keeps that filter is left to the LLM judge.
      const [goldResult, ...candidateResults] = await Promise.allSettled([
        runQuery(normalizedGold),
        ...candidateQueries.map((query) =>
          runQuery(normalizeEsqlForEquivalence(query, { anyTimeField: true }))
        ),
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

      const goldValues = goldResult.value.values ?? [];
      if (goldValues.length === 0) {
        // Usually a missing fixture or time window; an empty candidate would otherwise match for free.
        return {
          score: null,
          label: 'gold-empty-result',
          explanation:
            'Gold query returned no rows, so there is nothing to compare result sets against.',
          metadata: { goldQuery, candidateQueries },
        };
      }
      if (
        goldLimit.sorted &&
        (await limitCutsThroughTie(normalizedGold, goldValues.length, goldLimit.sorted, runQuery))
      ) {
        return skippedResult(
          'Gold query LIMIT cuts through rows tied on every SORT key; which tied rows survive is not deterministic.'
        );
      }

      const goldRows = normalizeRows(goldValues, normalize);
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
          .map((comparison, index) => {
            const description = describeComparison(comparison, goldRows.length);
            return comparisons.length > 1 ? `[${index}] ${description}` : description;
          })
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { EvaluationResult, Evaluator, Example, TaskOutput } from '@kbn/evals';

export interface QueryRule {
  /** Regular expression source, kept as a string so datasets stay serializable. */
  readonly pattern: string;
  readonly flags?: string;
  /** Whether the pattern must be present in, or absent from, the generated query. */
  readonly present: boolean;
  readonly description: string;
}

export interface EsqlQueryExpectation {
  readonly query: string;
  readonly sourceCommand: string;
  readonly rules?: readonly QueryRule[];
}

export interface EsqlTimeRange {
  readonly from: string;
  readonly to: string;
}

type EsqlQueryResult =
  | { readonly rowCount: number; readonly error?: undefined }
  | { readonly error: string };

export type EsqlQueryRunner = (query: string) => Promise<EsqlQueryResult>;

type QueryExtractor<TTaskOutput extends TaskOutput> = (output: TTaskOutput) => string;

const COMMENTS = /\/\*[\s\S]*?\*\/|\/\/[^\n]*/g;

const getSourceCommand = (query: string): string | undefined =>
  query.replace(COMMENTS, '').trim().split(/\s/, 1)[0]?.toUpperCase() || undefined;

const getExpectation = (expected: unknown): EsqlQueryExpectation | undefined =>
  expected && typeof expected === 'object' && 'sourceCommand' in expected
    ? (expected as EsqlQueryExpectation)
    : undefined;

const noQuery: EvaluationResult = {
  score: 0,
  label: 'no-query',
  explanation: 'No query was generated',
};

/**
 * Runs ES|QL queries with `?_tstart` / `?_tend` bound to the time range, once per query.
 */
export const createEsqlQueryRunner = ({
  esClient,
  timeRange,
}: {
  esClient: Client;
  timeRange: EsqlTimeRange;
}): EsqlQueryRunner => {
  const results = new Map<string, Promise<EsqlQueryResult>>();

  const run = async (query: string): Promise<EsqlQueryResult> => {
    try {
      const response = await esClient.esql.query({
        query,
        params: [{ _tstart: timeRange.from }, { _tend: timeRange.to }],
      });
      return { rowCount: response.values.length };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  };

  return (query) => {
    const cached = results.get(query);
    if (cached) {
      return cached;
    }
    const result = run(query);
    results.set(query, result);
    return result;
  };
};

/**
 * Scores whether the generated query starts with the expected source command, such as `PROMQL` or `TS`.
 */
export const createSourceCommandEvaluator = <
  TExample extends Example,
  TTaskOutput extends TaskOutput
>({
  extractQuery,
}: {
  extractQuery: QueryExtractor<TTaskOutput>;
}): Evaluator<TExample, TTaskOutput> => ({
  name: 'Source Command',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const expectation = getExpectation(expected);
    if (!expectation) {
      return { score: null, label: 'skipped' };
    }
    const query = extractQuery(output);
    if (!query) {
      return noQuery;
    }
    const actual = getSourceCommand(query);
    const matches = actual === expectation.sourceCommand;
    return {
      score: matches ? 1 : 0,
      label: matches ? 'match' : 'mismatch',
      explanation: `Expected ${expectation.sourceCommand}, got ${actual ?? 'nothing'}`,
    };
  },
});

/**
 * Scores whether the generated query runs over the time range (Query Executes) and returns rows (Query Returns Rows).
 */
export const createEsqlExecutionEvaluators = <
  TExample extends Example,
  TTaskOutput extends TaskOutput
>({
  extractQuery,
  runQuery,
}: {
  extractQuery: QueryExtractor<TTaskOutput>;
  runQuery: EsqlQueryRunner;
}): Array<Evaluator<TExample, TTaskOutput>> => [
  {
    name: 'Query Executes',
    kind: 'CODE',
    direction: 'maximize',
    evaluate: async ({ output }) => {
      const query = extractQuery(output);
      if (!query) {
        return noQuery;
      }
      const result = await runQuery(query);
      return result.error === undefined
        ? { score: 1, label: 'executed' }
        : { score: 0, label: 'error', explanation: result.error };
    },
  },
  {
    name: 'Query Returns Rows',
    kind: 'CODE',
    direction: 'maximize',
    evaluate: async ({ output }) => {
      const query = extractQuery(output);
      if (!query) {
        return noQuery;
      }
      const result = await runQuery(query);
      if (result.error !== undefined) {
        return { score: 0, label: 'error', explanation: result.error };
      }
      return result.rowCount > 0
        ? { score: 1, label: 'rows', explanation: `${result.rowCount} rows` }
        : { score: 0, label: 'empty', explanation: 'The query ran but returned no rows' };
    },
  },
];

/**
 * Scores the fraction of the example's query rules that the generated query satisfies.
 */
export const createQueryRulesEvaluator = <
  TExample extends Example,
  TTaskOutput extends TaskOutput
>({
  extractQuery,
}: {
  extractQuery: QueryExtractor<TTaskOutput>;
}): Evaluator<TExample, TTaskOutput> => ({
  name: 'Query Rules',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const rules = getExpectation(expected)?.rules ?? [];
    if (rules.length === 0) {
      return { score: null, label: 'skipped' };
    }
    const query = extractQuery(output);
    if (!query) {
      return noQuery;
    }
    const violated = rules.filter(
      ({ pattern, flags, present }) => new RegExp(pattern, flags).test(query) !== present
    );
    return {
      score: (rules.length - violated.length) / rules.length,
      label: violated.length === 0 ? 'pass' : 'fail',
      explanation:
        violated.length === 0
          ? `All ${rules.length} rules hold`
          : `Violated: ${violated.map(({ description }) => description).join('; ')}`,
    };
  },
});

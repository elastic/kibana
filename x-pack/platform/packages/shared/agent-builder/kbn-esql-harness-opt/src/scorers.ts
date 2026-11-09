/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import { validateQuery } from '@kbn/esql-language';

/**
 * Deterministic, code-only scoring of a generated ES|QL query. No LLM judge anywhere in the
 * reward: the judge is slower, noisier, and — measured in the security suite it is ported from —
 * scores *below* result equivalence because it penalises cosmetic differences.
 */

const DEFAULT_TSTART = '2000-01-01T00:00:00.000Z';
const DEFAULT_TEND = '2100-12-31T23:59:59.999Z';

/** Replace the agent's named time parameters so a query can run outside the tool's param binding. */
export const substituteBindParams = (query: string): string =>
  query.replace(/\?_tstart\b/g, `"${DEFAULT_TSTART}"`).replace(/\?_tend\b/g, `"${DEFAULT_TEND}"`);

export interface QueryScore {
  astValid: boolean;
  executes: boolean;
  /** Jaccard over normalised row multisets vs the gold query; `null` when gold is not executable. */
  resultEquivalence: number | null;
  rowCount: number | null;
  goldRowCount: number | null;
  error?: string;
  /** `0.6 · result_equivalence + 0.3 · executes + 0.1 · ast_valid`, gold-less examples renormalised. */
  reward: number;
}

interface EsqlResult {
  columns?: Array<{ name: string; type: string }>;
  values?: unknown[][];
}

const normalizeRows = (result: EsqlResult): string[] => {
  const values = result.values ?? [];
  return values
    .map((row) =>
      JSON.stringify(
        row.map((value) => (typeof value === 'number' ? Number(value.toFixed(4)) : value))
      )
    )
    .sort();
};

const jaccard = (goldRows: string[], candidateRows: string[]): number => {
  if (goldRows.length === 0 && candidateRows.length === 0) {
    return 1;
  }
  const counts = new Map<string, number>();
  for (const row of goldRows) counts.set(row, (counts.get(row) ?? 0) + 1);
  let intersection = 0;
  const candidateCounts = new Map<string, number>();
  for (const row of candidateRows) candidateCounts.set(row, (candidateCounts.get(row) ?? 0) + 1);
  for (const [row, goldCount] of counts) {
    intersection += Math.min(goldCount, candidateCounts.get(row) ?? 0);
  }
  const union = goldRows.length + candidateRows.length - intersection;
  return union === 0 ? 1 : intersection / union;
};

const runQuery = async (
  esClient: EsClient,
  query: string
): Promise<{ result?: EsqlResult; error?: string }> => {
  try {
    const result = (await esClient.esql.query({
      query: substituteBindParams(query),
    })) as EsqlResult;
    return { result };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
};

/** Execute the gold query once per example so candidate rows have something to be compared to. */
export const executeGold = async (
  esClient: EsClient,
  goldQuery: string
): Promise<{ rows: string[] | null; error?: string }> => {
  const { result, error } = await runQuery(esClient, goldQuery);
  if (!result) {
    return { rows: null, error };
  }
  return { rows: normalizeRows(result) };
};

export const scoreQuery = async ({
  esClient,
  query,
  goldRows,
}: {
  esClient: EsClient;
  query: string | undefined;
  goldRows: string[] | null;
}): Promise<QueryScore> => {
  if (!query || query.trim().length === 0) {
    return {
      astValid: false,
      executes: false,
      resultEquivalence: goldRows ? 0 : null,
      rowCount: null,
      goldRowCount: goldRows?.length ?? null,
      error: 'No query produced',
      reward: 0,
    };
  }

  const { errors } = await validateQuery(query);
  const astValid = errors.length === 0;
  const { result, error } = await runQuery(esClient, query);
  const executes = Boolean(result);
  const candidateRows = result ? normalizeRows(result) : null;
  const resultEquivalence =
    goldRows && candidateRows ? jaccard(goldRows, candidateRows) : goldRows ? 0 : null;

  // When the gold query itself does not execute against the fixtures, result equivalence is
  // unmeasurable; the remaining components are renormalised rather than scored as zero, which
  // would otherwise punish every candidate for a dataset defect.
  const reward =
    resultEquivalence === null
      ? (0.3 * (executes ? 1 : 0) + 0.1 * (astValid ? 1 : 0)) / 0.4
      : 0.6 * resultEquivalence + 0.3 * (executes ? 1 : 0) + 0.1 * (astValid ? 1 : 0);

  return {
    astValid,
    executes,
    resultEquivalence,
    rowCount: candidateRows?.length ?? null,
    goldRowCount: goldRows?.length ?? null,
    error,
    reward,
  };
};

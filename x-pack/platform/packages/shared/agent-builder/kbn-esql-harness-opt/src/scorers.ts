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
  /** Whether the candidate's columns could be matched to the gold's by content. */
  columnsAligned?: boolean;
  /** Columns the candidate returned beyond the ones the gold query produced. */
  extraColumns?: number;
  /** Jaccard over normalised row multisets vs the gold query; `null` when gold is not executable. */
  resultEquivalence: number | null;
  rowCount: number | null;
  goldRowCount: number | null;
  error?: string;
  /** `0.6 · result_equivalence + 0.3 · executes + 0.1 · ast_valid`, gold-less examples renormalised. */
  reward: number;
}

export interface EsqlResult {
  columns?: Array<{ name: string; type: string }>;
  values?: unknown[][];
}

const roundValue = (value: unknown): unknown =>
  typeof value === 'number' ? Number(value.toFixed(4)) : value;

/** Signature of a column: its values as an order-independent multiset. */
const columnSignature = (values: unknown[][], index: number): string =>
  JSON.stringify(
    values
      .map((row) => roundValue(row[index]))
      .map((value) => JSON.stringify(value))
      .sort()
  );

/**
 * Align the candidate's columns to the gold's by content, then compare rows.
 *
 * ES|QL puts the grouping key last in `STATS … BY`, so a candidate that adds a `KEEP` to control
 * the output order produces the same data in a different column order — and under a naive
 * positional comparison that scored zero. Column *names* differ freely too (`p95` vs
 * `p95_distance`), so alignment is by the values a column contains, not by its name or position.
 *
 * A candidate that also returns extra columns still aligns: the data that was asked for is
 * there. Extra columns are reported separately rather than silently scored as wrong.
 */
const alignColumns = (
  gold: EsqlResult,
  candidate: EsqlResult
): { goldRows: string[]; candidateRows: string[]; aligned: boolean; extraColumns: number } => {
  const goldValues = gold.values ?? [];
  const candidateValues = candidate.values ?? [];
  const goldWidth = gold.columns?.length ?? goldValues[0]?.length ?? 0;
  const candidateWidth = candidate.columns?.length ?? candidateValues[0]?.length ?? 0;

  const used = new Set<number>();
  const mapping: number[] = [];
  for (let goldIndex = 0; goldIndex < goldWidth; goldIndex++) {
    const signature = columnSignature(goldValues, goldIndex);
    let match = -1;
    for (let candidateIndex = 0; candidateIndex < candidateWidth; candidateIndex++) {
      if (used.has(candidateIndex)) continue;
      if (columnSignature(candidateValues, candidateIndex) === signature) {
        match = candidateIndex;
        break;
      }
    }
    if (match === -1) {
      // No alignment possible: fall back to comparing each row as a multiset of values, which
      // still rewards the right numbers in the wrong shape.
      const asMultiset = (values: unknown[][]) =>
        values
          .map((row) =>
            JSON.stringify(
              row
                .map(roundValue)
                .map((value) => JSON.stringify(value))
                .sort()
            )
          )
          .sort();
      return {
        goldRows: asMultiset(goldValues),
        candidateRows: asMultiset(candidateValues),
        aligned: false,
        extraColumns: Math.max(0, candidateWidth - goldWidth),
      };
    }
    used.add(match);
    mapping.push(match);
  }

  const project = (values: unknown[][], indices: number[]) =>
    values.map((row) => JSON.stringify(indices.map((index) => roundValue(row[index])))).sort();

  return {
    goldRows: project(
      goldValues,
      Array.from({ length: goldWidth }, (unused, index) => index)
    ),
    candidateRows: project(candidateValues, mapping),
    aligned: true,
    extraColumns: Math.max(0, candidateWidth - goldWidth),
  };
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

/**
 * Execute the gold query once per example.
 *
 * The whole result is kept, not just normalised rows: column alignment needs the gold's columns
 * to compare against each candidate.
 */
export const executeGold = async (
  esClient: EsClient,
  goldQuery: string
): Promise<{ rows: EsqlResult | null; error?: string }> => {
  const { result, error } = await runQuery(esClient, goldQuery);
  return result ? { rows: result } : { rows: null, error };
};

export const scoreQuery = async ({
  esClient,
  query,
  goldRows,
}: {
  esClient: EsClient;
  query: string | undefined;
  goldRows: EsqlResult | null;
}): Promise<QueryScore> => {
  if (!query || query.trim().length === 0) {
    return {
      astValid: false,
      executes: false,
      resultEquivalence: goldRows ? 0 : null,
      rowCount: null,
      goldRowCount: goldRows?.values?.length ?? null,
      error: 'No query produced',
      reward: 0,
    };
  }

  const { errors } = await validateQuery(query);
  const astValid = errors.length === 0;
  const { result, error } = await runQuery(esClient, query);
  const executes = Boolean(result);

  let resultEquivalence: number | null = null;
  let columnsAligned: boolean | undefined;
  let extraColumns: number | undefined;
  if (goldRows && result) {
    const alignment = alignColumns(goldRows, result);
    resultEquivalence = jaccard(alignment.goldRows, alignment.candidateRows);
    columnsAligned = alignment.aligned;
    extraColumns = alignment.extraColumns;
  } else if (goldRows) {
    resultEquivalence = 0;
  }

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
    columnsAligned,
    extraColumns,
    resultEquivalence,
    rowCount: result?.values?.length ?? null,
    goldRowCount: goldRows?.values?.length ?? null,
    error,
    reward,
  };
};

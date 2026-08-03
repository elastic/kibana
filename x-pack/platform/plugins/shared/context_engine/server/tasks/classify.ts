/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseDocument, CaseLabel, CasePartition } from '../cases/storage';
import type { PatternDocument } from '../patterns/storage';

/**
 * Deterministic-first classification (v1). These labels are directly observable
 * on a case; the LLM refinement (missing_fact / ambiguous_ki / stale_ki, which
 * need KI retrieval to exist) is layered on later. Describes the symptom, not
 * the fix — patterns map 1-to-many to improvements.
 */
export const CLASSIFIER_VERSION = 'det-v1';

export const classifyCase = (c: CaseDocument): CaseLabel[] => {
  // The management agent's own trace-analysis queries are not user retrievals.
  if (c.agent?.class === 'management') {
    return [];
  }
  const labels: CaseLabel[] = [];
  if (c.status === 'Error') {
    labels.push({ type: 'query_error', confidence: 1 });
  }
  if (c.returned?.row_count === 0) {
    labels.push({ type: 'empty_retrieval', confidence: 1 });
  }
  if (c.query_kind === 'raw_access') {
    // The agent went to raw data instead of a KI — a coverage-gap signal,
    // strengthened when it also looped.
    labels.push({ type: 'coverage_gap', confidence: c.round_signals?.looped ? 0.9 : 0.6 });
  }
  return labels;
};

/** `{type}:{sub_type}:{target_index}` — the same failure pattern collapses to one key. */
export const patternKeyFor = (label: CaseLabel, c: CaseDocument): string =>
  `${label.type}:${label.sub_type ?? '_'}:${c.target_index ?? '_'}`;

const TYPE_LABELS: Record<string, string> = {
  coverage_gap: 'Coverage gap',
  query_error: 'Query error',
  empty_retrieval: 'Empty retrieval',
};

/** Human label for a failure-mode type, e.g. `coverage_gap` → "Coverage gap". */
export const humanizeType = (type: string): string =>
  TYPE_LABELS[type] ?? type.replace(/_/g, ' ').replace(/^\w/, (ch) => ch.toUpperCase());

/**
 * A short, human-readable description of what the classifier spotted for a
 * pattern — rendered as the pattern's summary in the UI. Deterministic (v1):
 * derived from the failure type, the target index, and observable case signals.
 * When the LLM refinement lands it can overwrite this with a richer narrative.
 */
export const describePattern = ({
  type,
  targetIndex,
  caseCount,
  cases,
}: {
  type: string;
  targetIndex?: string;
  caseCount: number;
  cases: CaseDocument[];
}): string => {
  const where = targetIndex && targetIndex !== '_' ? targetIndex : 'the source index';
  const events = `${caseCount} ${caseCount === 1 ? 'time' : 'times'}`;
  const retrievals = caseCount === 1 ? 'retrieval' : 'retrievals';
  const loopedCount = cases.filter((c) => c.round_signals?.looped).length;
  const loopedNote = loopedCount
    ? ` The agent looped back to raw data in ${loopedCount} of these rounds instead of resolving the answer once.`
    : '';

  switch (type) {
    case 'coverage_gap':
      return (
        `The agent queried ${where} directly instead of retrieving a knowledge item (${events}). ` +
        `This points to missing knowledge-item coverage for these questions — adding or broadening a ` +
        `knowledge-item automation should let it answer from curated context rather than raw data.` +
        loopedNote
      );
    case 'query_error':
      return (
        `${caseCount} ${retrievals} against ${where} failed with an error. Recurring query errors ` +
        `usually mean a broken automation, a schema mismatch, or malformed ES|QL — open a trace to ` +
        `see the failing query.`
      );
    case 'empty_retrieval':
      return (
        `${caseCount} ${retrievals} against ${where} returned no rows. The agent asked for something ` +
        `the index doesn't contain — a likely coverage or freshness gap.`
      );
    default:
      return `${humanizeType(type)} detected on ${where} across ${events}.`;
  }
};

/** Deterministic, leakage-stable partitioning by round so a round never splits. */
export const partitionFor = (roundId: string): CasePartition => {
  let hash = 0;
  for (let i = 0; i < roundId.length; i++) {
    // eslint-disable-next-line no-bitwise -- unsigned 32-bit hash for stable partitioning
    hash = (hash * 31 + roundId.charCodeAt(i)) >>> 0;
  }
  const bucket = hash % 100;
  if (bucket < 70) {
    return 'dev';
  }
  if (bucket < 85) {
    return 'eval';
  }
  return 'regression';
};

const sortedDefined = (values: Array<string | undefined>): string[] =>
  values.filter((v): v is string => Boolean(v)).sort();

/**
 * Folds a batch of cases sharing a pattern key into a pattern record, merging
 * with the existing record (running counts, evidence, partition tallies).
 */
export const mergePattern = ({
  existing,
  patternKey,
  type,
  subType,
  aiIndexId,
  cases,
}: {
  existing: PatternDocument | undefined;
  patternKey: string;
  type: string;
  subType?: string;
  aiIndexId: string;
  cases: CaseDocument[];
}): PatternDocument => {
  const timestamps = sortedDefined(cases.map((c) => c['@timestamp']));
  const caseCount = (existing?.evidence?.case_count ?? 0) + cases.length;
  const representativeCaseIds = Array.from(
    new Set([
      ...(existing?.evidence?.representative_case_ids ?? []),
      ...cases.map((c) => c.case_id),
    ])
  ).slice(0, 5);
  const firstSeen = sortedDefined([existing?.evidence?.first_seen, ...timestamps])[0];
  const lastSeen = sortedDefined([existing?.evidence?.last_seen, ...timestamps]).slice(-1)[0];
  const countPartition = (p: CasePartition) => cases.filter((c) => c.partition === p).length;
  const targetIndex = patternKey.split(':')[2];

  return {
    pattern_key: patternKey,
    type,
    sub_type: subType,
    ai_index_id: aiIndexId,
    status: existing?.status ?? 'open',
    summary: describePattern({ type, targetIndex, caseCount, cases }),
    evidence: {
      case_count: caseCount,
      first_seen: firstSeen,
      last_seen: lastSeen,
      frequency: caseCount,
      confidence: 1,
      representative_case_ids: representativeCaseIds,
    },
    partitions: {
      dev_count: (existing?.partitions?.dev_count ?? 0) + countPartition('dev'),
      eval_count: (existing?.partitions?.eval_count ?? 0) + countPartition('eval'),
      regression_count:
        (existing?.partitions?.regression_count ?? 0) + countPartition('regression'),
    },
  };
};

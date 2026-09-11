/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const DEFAULT_MAX_TYPES = 5;

/**
 * Minimal shape needed from `esClient.helpers.bulk`'s `onDrop` callback
 * payload. Kept structural (rather than importing
 * `@elastic/elasticsearch/lib/helpers`'s `OnDropDocument`) so callers can
 * pass the hook payload straight through without an extra type import.
 */
export interface BulkDropRecord {
  status: number;
  error?: { type?: string | null; reason?: string | null } | null;
}

export interface BulkDropTypeSummary {
  /** ES error type (e.g. `security_exception`, `mapper_parsing_exception`), or `unknown` when absent. */
  type: string;
  /** Number of dropped docs that shared this error type. */
  count: number;
  /** HTTP-like status of the first drop seen for this type. */
  status: number;
  /** Reason string from the first drop seen for this type, kept as a representative sample. */
  sampleReason: string;
}

/**
 * Formats a drop summary into a single bounded log line, sorted by
 * frequency so the most impactful failure leads. Caps the number of error
 * types shown so a run with many distinct failures still produces a
 * readable (and boundedly-sized) log line.
 */
export const formatBulkDropSummary = (
  summary: BulkDropTypeSummary[],
  maxTypes: number = DEFAULT_MAX_TYPES
): string => {
  const sorted = [...summary].sort((a, b) => b.count - a.count);
  const shown = sorted
    .slice(0, maxTypes)
    .map(
      ({ type, count, status, sampleReason }) =>
        `${type} (${count}, status ${status}): ${sampleReason}`
    )
    .join(' | ');
  const overflowCount = sorted.length - maxTypes;
  const overflow = overflowCount > 0 ? ` (+${overflowCount} more error types)` : '';
  return `${shown}${overflow}`;
};

/**
 * Accumulates per-document bulk drops (as reported by `esClient.helpers.bulk`'s
 * `onDrop` hook, called once per rejected document) into a per-error-type
 * summary. A systemic failure — missing privileges, a read-only index, a
 * mapping conflict — rejects every document in the batch with the same
 * error type, so grouping here turns thousands of identical `onDrop` calls
 * into a handful of summary entries instead of one log line each.
 */
export class BulkDropAggregator {
  private readonly byType = new Map<string, BulkDropTypeSummary>();

  record(dropped: BulkDropRecord): void {
    const type = dropped.error?.type ?? 'unknown';
    const existing = this.byType.get(type);
    if (existing) {
      existing.count += 1;
      return;
    }
    this.byType.set(type, {
      type,
      count: 1,
      status: dropped.status,
      sampleReason: dropped.error?.reason ?? 'unknown error',
    });
  }

  public get total(): number {
    let total = 0;
    for (const { count } of this.byType.values()) total += count;
    return total;
  }

  summary(): BulkDropTypeSummary[] {
    return [...this.byType.values()].sort((a, b) => b.count - a.count);
  }

  format(maxTypes?: number): string {
    return formatBulkDropSummary(this.summary(), maxTypes);
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Pattern } from '../../../../common/http_api/patterns';

const TYPE_LABELS: Record<string, string> = {
  coverage_gap: 'Coverage gap',
  query_error: 'Query error',
  empty_retrieval: 'Empty retrieval',
};

/** Human label for a failure-mode type, e.g. `coverage_gap` → "Coverage gap". */
export const humanizePatternType = (type: string): string =>
  TYPE_LABELS[type] ?? type.replace(/_/g, ' ').replace(/^\w/, (char) => char.toUpperCase());

/** The target index the pattern is scoped to (3rd segment of the pattern key), or undefined. */
export const patternTarget = (pattern: Pattern): string | undefined => {
  const target = pattern.pattern_key.split(':')[2];
  return target && target !== '_' ? target : undefined;
};

/** Formal, human title for a pattern, built from its type and target index. */
export const patternTitle = (pattern: Pattern): string => {
  const type = humanizePatternType(pattern.type);
  const target = patternTarget(pattern);
  return target ? `${type} · ${target}` : type;
};

/**
 * The classifier-written summary, or a lightweight client-derived fallback when
 * a pattern predates the summary field (it gets backfilled the next time the
 * classifier folds new cases into it). Keep in step with the server's
 * `describePattern`.
 */
export const patternSummary = (pattern: Pattern): string => {
  if (pattern.summary) {
    return pattern.summary;
  }
  const target = patternTarget(pattern);
  const where = target ?? 'the source index';
  const count = pattern.evidence?.case_count ?? 0;
  const times = `${count} ${count === 1 ? 'time' : 'times'}`;
  const retrievals = count === 1 ? 'retrieval' : 'retrievals';
  switch (pattern.type) {
    case 'coverage_gap':
      return `The agent queried ${where} directly instead of retrieving a knowledge item (${times}) — a likely knowledge-item coverage gap.`;
    case 'query_error':
      return `${count} ${retrievals} against ${where} failed with an error.`;
    case 'empty_retrieval':
      return `${count} ${retrievals} against ${where} returned no rows.`;
    default:
      return `${humanizePatternType(pattern.type)} detected on ${where} across ${times}.`;
  }
};

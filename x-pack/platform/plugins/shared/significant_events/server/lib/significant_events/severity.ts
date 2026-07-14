/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Maps human-readable severity labels to prefixed strings that sort correctly
 * as ES keywords. Mirrors the `mapped_params.severity` pattern in the alerting
 * framework (`mapped_params_utils.ts`): a numeric prefix guarantees that
 * alphabetic keyword sort yields the right severity order without a script.
 *
 * Sort `desc` to get critical first:
 *   80-critical > 60-high > 40-medium > 20-low
 */
export const SEVERITY_SORT_MAP: Record<string, string> = {
  low: '20-low',
  medium: '40-medium',
  high: '60-high',
  critical: '80-critical',
};

const SEVERITY_LABEL_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(SEVERITY_SORT_MAP).map(([label, stored]) => [stored, label])
);

/** Convert a human-readable severity label to its sortable stored form. */
export const toSortableSeverity = (severity: string): string =>
  SEVERITY_SORT_MAP[severity] ?? severity;

/** Convert a stored sortable severity back to its human-readable label. */
export const fromSortableSeverity = (severity: string): string =>
  SEVERITY_LABEL_MAP[severity] ?? severity;

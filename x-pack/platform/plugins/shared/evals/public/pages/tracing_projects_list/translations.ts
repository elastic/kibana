/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PAGE_TITLE = i18n.translate('xpack.evals.tracing.projectsList.pageTitle', {
  defaultMessage: 'Tracing',
});

export const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.evals.tracing.projectsList.searchPlaceholder',
  { defaultMessage: 'Search projects...' }
);

export const COLUMN_NAME = i18n.translate('xpack.evals.tracing.projectsList.columns.name', {
  defaultMessage: 'Name',
});

export const COLUMN_LAST_TRACE = i18n.translate(
  'xpack.evals.tracing.projectsList.columns.lastTrace',
  { defaultMessage: 'Most Recent Trace' }
);

export const COLUMN_TRACE_COUNT = i18n.translate(
  'xpack.evals.tracing.projectsList.columns.traceCount',
  { defaultMessage: 'Trace Count' }
);

export const COLUMN_ERROR_RATE = i18n.translate(
  'xpack.evals.tracing.projectsList.columns.errorRate',
  { defaultMessage: 'Error Rate' }
);

export const COLUMN_P50_LATENCY = i18n.translate(
  'xpack.evals.tracing.projectsList.columns.p50Latency',
  { defaultMessage: 'P50 Latency' }
);

export const COLUMN_P99_LATENCY = i18n.translate(
  'xpack.evals.tracing.projectsList.columns.p99Latency',
  { defaultMessage: 'P99 Latency' }
);

export const COLUMN_TOTAL_TOKENS = i18n.translate(
  'xpack.evals.tracing.projectsList.columns.totalTokens',
  { defaultMessage: 'Total Tokens' }
);

export const TABLE_CAPTION = i18n.translate('xpack.evals.tracing.projectsList.tableCaption', {
  defaultMessage: 'Tracing projects',
});

export const NO_PROJECTS_TITLE = i18n.translate(
  'xpack.evals.tracing.projectsList.noProjectsTitle',
  { defaultMessage: 'No tracing projects found' }
);

export const NO_PROJECTS_BODY = i18n.translate('xpack.evals.tracing.projectsList.noProjectsBody', {
  defaultMessage:
    'Tracing projects are automatically created from root inference spans. Ensure OTEL tracing is enabled and the EDOT collector is running.',
});

export const formatLatency = (ms: number): string => {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${ms.toFixed(1)}ms`;
};

export const formatErrorRate = (rate: number): string => `${Math.round(rate * 100)}%`;

export const REFRESH_BUTTON_LABEL = i18n.translate(
  'xpack.evals.tracing.projectsList.refreshButtonLabel',
  { defaultMessage: 'Refresh' }
);

export const AUTO_REFRESH_ARIA_LABEL = i18n.translate(
  'xpack.evals.tracing.projectsList.autoRefreshAriaLabel',
  { defaultMessage: 'Configure auto-refresh interval' }
);

export const formatTokens = (tokens: number): string => {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return String(tokens);
};

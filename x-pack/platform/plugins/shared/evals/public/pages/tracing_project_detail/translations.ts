/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TRACES_TAB = i18n.translate('xpack.evals.tracing.projectDetail.tracesTab', {
  defaultMessage: 'Traces',
});

export const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.evals.tracing.projectDetail.searchPlaceholder',
  { defaultMessage: 'Filter traces...' }
);

export const COLUMN_NAME = i18n.translate('xpack.evals.tracing.projectDetail.columns.name', {
  defaultMessage: 'Name',
});

export const COLUMN_INPUT = i18n.translate('xpack.evals.tracing.projectDetail.columns.input', {
  defaultMessage: 'Input',
});

export const COLUMN_OUTPUT = i18n.translate('xpack.evals.tracing.projectDetail.columns.output', {
  defaultMessage: 'Output',
});

export const COLUMN_START_TIME = i18n.translate(
  'xpack.evals.tracing.projectDetail.columns.startTime',
  { defaultMessage: 'Start Time' }
);

export const COLUMN_LATENCY = i18n.translate('xpack.evals.tracing.projectDetail.columns.latency', {
  defaultMessage: 'Latency',
});

export const COLUMN_TOKENS = i18n.translate('xpack.evals.tracing.projectDetail.columns.tokens', {
  defaultMessage: 'Tokens',
});

export const COLUMN_SPANS = i18n.translate('xpack.evals.tracing.projectDetail.columns.spans', {
  defaultMessage: 'Spans',
});

export const COLUMN_PROMPT = i18n.translate('xpack.evals.tracing.projectDetail.columns.prompt', {
  defaultMessage: 'Feature / Prompt',
});

export const COLUMN_MODEL = i18n.translate('xpack.evals.tracing.projectDetail.columns.model', {
  defaultMessage: 'Model',
});

export const TABLE_CAPTION = i18n.translate('xpack.evals.tracing.projectDetail.tableCaption', {
  defaultMessage: 'Project traces',
});

export const STAT_TOTAL_TRACES = i18n.translate(
  'xpack.evals.tracing.projectDetail.stats.totalTraces',
  { defaultMessage: 'Total traces' }
);

export const STAT_ERROR_RATE = i18n.translate('xpack.evals.tracing.projectDetail.stats.errorRate', {
  defaultMessage: 'Error rate',
});

export const BREADCRUMB_TRACING = i18n.translate(
  'xpack.evals.tracing.projectDetail.breadcrumb.tracing',
  { defaultMessage: 'Tracing' }
);

export const NO_TRACES_TITLE = i18n.translate('xpack.evals.tracing.projectDetail.noTracesTitle', {
  defaultMessage: 'No traces found',
});

export const NO_TRACES_BODY = i18n.translate('xpack.evals.tracing.projectDetail.noTracesBody', {
  defaultMessage: 'No traces have been recorded for this project yet.',
});

export const getTraceFlyoutTitle = (traceId: string) =>
  i18n.translate('xpack.evals.tracing.projectDetail.traceFlyoutTitle', {
    defaultMessage: 'Trace: {traceId}',
    values: { traceId },
  });

export const REFRESH_BUTTON_LABEL = i18n.translate(
  'xpack.evals.tracing.projectDetail.refreshButtonLabel',
  { defaultMessage: 'Refresh' }
);

export const AUTO_REFRESH_ARIA_LABEL = i18n.translate(
  'xpack.evals.tracing.projectDetail.autoRefreshAriaLabel',
  { defaultMessage: 'Configure auto-refresh interval' }
);

export const LOAD_ERROR_TITLE = i18n.translate('xpack.evals.tracing.projectDetail.loadErrorTitle', {
  defaultMessage: 'Unable to load traces',
});

export const getLoadErrorBody = (errorMessage: string) =>
  i18n.translate('xpack.evals.tracing.projectDetail.loadErrorBody', {
    defaultMessage: 'An error occurred while loading traces: {errorMessage}',
    values: { errorMessage },
  });

export const RETRY_BUTTON = i18n.translate('xpack.evals.tracing.projectDetail.retryButton', {
  defaultMessage: 'Retry',
});

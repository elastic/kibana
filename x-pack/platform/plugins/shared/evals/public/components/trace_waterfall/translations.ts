/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const LEGEND_LLM = i18n.translate('xpack.evals.traceWaterfall.legend.llm', {
  defaultMessage: 'LLM',
});

export const LEGEND_TOOL = i18n.translate('xpack.evals.traceWaterfall.legend.tool', {
  defaultMessage: 'Tool',
});

export const LEGEND_SEARCH = i18n.translate('xpack.evals.traceWaterfall.legend.search', {
  defaultMessage: 'Search',
});

export const LEGEND_HTTP = i18n.translate('xpack.evals.traceWaterfall.legend.http', {
  defaultMessage: 'HTTP',
});

export const LEGEND_OTHER = i18n.translate('xpack.evals.traceWaterfall.legend.other', {
  defaultMessage: 'Other',
});

export const HIDE_NOISE_LABEL = i18n.translate('xpack.evals.traceWaterfall.hideNoiseLabel', {
  defaultMessage: 'Hide noise',
});

export const ERROR_LOADING_TRACE_TITLE = i18n.translate(
  'xpack.evals.traceWaterfall.errorLoadingTraceTitle',
  { defaultMessage: 'Error loading trace' }
);

export const NO_SPANS_FOUND_TITLE = i18n.translate('xpack.evals.traceWaterfall.noSpansFoundTitle', {
  defaultMessage: 'No spans found',
});

export const CLOSE_DETAIL_ARIA = i18n.translate('xpack.evals.traceWaterfall.closeDetailAriaLabel', {
  defaultMessage: 'Close detail',
});

export const COPY_SPAN_ID_ARIA = i18n.translate('xpack.evals.traceWaterfall.copySpanIdAriaLabel', {
  defaultMessage: 'Copy span ID',
});

export const DURATION_LABEL = i18n.translate('xpack.evals.traceWaterfall.durationLabel', {
  defaultMessage: 'Duration:',
});

export const KIND_LABEL = i18n.translate('xpack.evals.traceWaterfall.kindLabel', {
  defaultMessage: 'Kind:',
});

export const STATUS_LABEL = i18n.translate('xpack.evals.traceWaterfall.statusLabel', {
  defaultMessage: 'Status:',
});

export const INPUT_TOKENS_DESC = i18n.translate(
  'xpack.evals.traceWaterfall.inputTokensDescription',
  { defaultMessage: 'Input tokens' }
);

export const OUTPUT_TOKENS_DESC = i18n.translate(
  'xpack.evals.traceWaterfall.outputTokensDescription',
  { defaultMessage: 'Output tokens' }
);

export const TOTAL_TOKENS_DESC = i18n.translate(
  'xpack.evals.traceWaterfall.totalTokensDescription',
  { defaultMessage: 'Total tokens' }
);

export const TOOL_INPUT_HEADING = i18n.translate('xpack.evals.traceWaterfall.toolInputHeading', {
  defaultMessage: 'Tool Input',
});

export const TOOL_OUTPUT_HEADING = i18n.translate('xpack.evals.traceWaterfall.toolOutputHeading', {
  defaultMessage: 'Tool Output',
});

export const LLM_ATTRIBUTES_HEADING = i18n.translate(
  'xpack.evals.traceWaterfall.llmAttributesHeading',
  { defaultMessage: 'LLM Attributes' }
);

export const HTTP_ATTRIBUTES_HEADING = i18n.translate(
  'xpack.evals.traceWaterfall.httpAttributesHeading',
  { defaultMessage: 'HTTP Attributes' }
);

export const getSpanCount = (count: number) =>
  i18n.translate('xpack.evals.traceWaterfall.spanCount', {
    defaultMessage: '{count} spans',
    values: { count },
  });

export const getHiddenCount = (count: number) =>
  i18n.translate('xpack.evals.traceWaterfall.hiddenCount', {
    defaultMessage: '{count} hidden',
    values: { count },
  });

export const getTotalDuration = (duration: string) =>
  i18n.translate('xpack.evals.traceWaterfall.totalDuration', {
    defaultMessage: '{duration}ms total',
    values: { duration },
  });

export const getOtherAttributesHeading = (count: number) =>
  i18n.translate('xpack.evals.traceWaterfall.otherAttributesHeading', {
    defaultMessage: 'Other Attributes ({count})',
    values: { count },
  });

export const getResourceAttributesHeading = (count: number) =>
  i18n.translate('xpack.evals.traceWaterfall.resourceAttributesHeading', {
    defaultMessage: 'Resource Attributes ({count})',
    values: { count },
  });

export const getCopyAttributeAriaLabel = (key: string) =>
  i18n.translate('xpack.evals.traceWaterfall.copyAttributeAriaLabel', {
    defaultMessage: 'Copy {key}',
    values: { key },
  });

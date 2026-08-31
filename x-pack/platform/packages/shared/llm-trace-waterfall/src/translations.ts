/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const LEGEND_LLM = i18n.translate('llmTraceWaterfall.legend.llm', {
  defaultMessage: 'LLM',
});

export const LEGEND_TOOL = i18n.translate('llmTraceWaterfall.legend.tool', {
  defaultMessage: 'Tool',
});

export const LEGEND_SEARCH = i18n.translate('llmTraceWaterfall.legend.search', {
  defaultMessage: 'Search',
});

export const LEGEND_HTTP = i18n.translate('llmTraceWaterfall.legend.http', {
  defaultMessage: 'HTTP',
});

export const LEGEND_OTHER = i18n.translate('llmTraceWaterfall.legend.other', {
  defaultMessage: 'Other',
});

export const HIDE_NOISE_LABEL = i18n.translate('llmTraceWaterfall.hideNoiseLabel', {
  defaultMessage: 'Hide noise',
});

export const ERROR_LOADING_TRACE_TITLE = i18n.translate(
  'llmTraceWaterfall.errorLoadingTraceTitle',
  {
    defaultMessage: 'Error loading trace',
  }
);

export const NO_SPANS_FOUND_TITLE = i18n.translate('llmTraceWaterfall.noSpansFoundTitle', {
  defaultMessage: 'No spans found',
});

export const CLOSE_DETAIL_ARIA = i18n.translate('llmTraceWaterfall.closeDetailAriaLabel', {
  defaultMessage: 'Close detail',
});

export const COPY_SPAN_ID_ARIA = i18n.translate('llmTraceWaterfall.copySpanIdAriaLabel', {
  defaultMessage: 'Copy span ID',
});

export const DURATION_LABEL = i18n.translate('llmTraceWaterfall.durationLabel', {
  defaultMessage: 'Duration:',
});

export const KIND_LABEL = i18n.translate('llmTraceWaterfall.kindLabel', {
  defaultMessage: 'Kind:',
});

export const STATUS_LABEL = i18n.translate('llmTraceWaterfall.statusLabel', {
  defaultMessage: 'Status:',
});

export const HTTP_ATTRIBUTES_HEADING = i18n.translate('llmTraceWaterfall.httpAttributesHeading', {
  defaultMessage: 'HTTP attributes',
});

export const ATTRIBUTE_FIELD_COLUMN = i18n.translate('llmTraceWaterfall.attributeFieldColumn', {
  defaultMessage: 'Field',
});

export const ATTRIBUTE_VALUE_COLUMN = i18n.translate('llmTraceWaterfall.attributeValueColumn', {
  defaultMessage: 'Value',
});

export const NO_ATTRIBUTES = i18n.translate('llmTraceWaterfall.noAttributes', {
  defaultMessage: 'No attributes available for this span.',
});

export const getSpanCount = (count: number) =>
  i18n.translate('llmTraceWaterfall.spanCount', {
    defaultMessage: '{count} spans',
    values: { count },
  });

export const getHiddenCount = (count: number) =>
  i18n.translate('llmTraceWaterfall.hiddenCount', {
    defaultMessage: '{count} hidden',
    values: { count },
  });

export const getTotalDuration = (duration: string) =>
  i18n.translate('llmTraceWaterfall.totalDuration', {
    defaultMessage: '{duration}ms total',
    values: { duration },
  });

export const getOtherAttributesHeading = (count: number) =>
  i18n.translate('llmTraceWaterfall.otherAttributesHeading', {
    defaultMessage: 'Other attributes ({count})',
    values: { count },
  });

export const getResourceAttributesHeading = (count: number) =>
  i18n.translate('llmTraceWaterfall.resourceAttributesHeading', {
    defaultMessage: 'Resource attributes ({count})',
    values: { count },
  });

export const getCopyAttributeAriaLabel = (key: string) =>
  i18n.translate('llmTraceWaterfall.copyAttributeAriaLabel', {
    defaultMessage: 'Copy {key}',
    values: { key },
  });

export const GENAI_TAB_LABEL = i18n.translate('llmTraceWaterfall.genAiTabLabel', {
  defaultMessage: 'GenAI',
});

export const ATTRIBUTES_TAB_LABEL = i18n.translate('llmTraceWaterfall.attributesTabLabel', {
  defaultMessage: 'Attributes',
});

export const SPAN_LIST_ARIA_LABEL = i18n.translate('llmTraceWaterfall.spanListAriaLabel', {
  defaultMessage: 'Trace spans',
});

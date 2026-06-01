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

export const INPUT_TOKENS_DESC = i18n.translate('llmTraceWaterfall.inputTokensDescription', {
  defaultMessage: 'Input tokens',
});

export const OUTPUT_TOKENS_DESC = i18n.translate('llmTraceWaterfall.outputTokensDescription', {
  defaultMessage: 'Output tokens',
});

export const TOTAL_TOKENS_DESC = i18n.translate('llmTraceWaterfall.totalTokensDescription', {
  defaultMessage: 'Total tokens',
});

export const TOOL_INPUT_HEADING = i18n.translate('llmTraceWaterfall.toolInputHeading', {
  defaultMessage: 'Tool Input',
});

export const TOOL_OUTPUT_HEADING = i18n.translate('llmTraceWaterfall.toolOutputHeading', {
  defaultMessage: 'Tool Output',
});

export const LLM_ATTRIBUTES_HEADING = i18n.translate('llmTraceWaterfall.llmAttributesHeading', {
  defaultMessage: 'LLM Attributes',
});

export const HTTP_ATTRIBUTES_HEADING = i18n.translate('llmTraceWaterfall.httpAttributesHeading', {
  defaultMessage: 'HTTP Attributes',
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
    defaultMessage: 'Other Attributes ({count})',
    values: { count },
  });

export const getResourceAttributesHeading = (count: number) =>
  i18n.translate('llmTraceWaterfall.resourceAttributesHeading', {
    defaultMessage: 'Resource Attributes ({count})',
    values: { count },
  });

export const getCopyAttributeAriaLabel = (key: string) =>
  i18n.translate('llmTraceWaterfall.copyAttributeAriaLabel', {
    defaultMessage: 'Copy {key}',
    values: { key },
  });

export const IO_TAB_LABEL = i18n.translate('llmTraceWaterfall.ioTabLabel', {
  defaultMessage: 'Input / Output',
});

export const ATTRIBUTES_TAB_LABEL = i18n.translate('llmTraceWaterfall.attributesTabLabel', {
  defaultMessage: 'Attributes',
});

export const NO_IO_DATA = i18n.translate('llmTraceWaterfall.noIoData', {
  defaultMessage: 'No input/output data available for this span.',
});

export const PROMPT_ID_LABEL = i18n.translate('llmTraceWaterfall.promptIdLabel', {
  defaultMessage: 'Prompt:',
});

export const MODEL_LABEL = i18n.translate('llmTraceWaterfall.modelLabel', {
  defaultMessage: 'Model:',
});

export const PROMPT_TEMPLATE_HEADING = i18n.translate('llmTraceWaterfall.promptTemplateHeading', {
  defaultMessage: 'Prompt Template',
});

export const PROMPT_VARIABLES_HEADING = i18n.translate('llmTraceWaterfall.promptVariablesHeading', {
  defaultMessage: 'Prompt Variables',
});

export const SPAN_LIST_ARIA_LABEL = i18n.translate('llmTraceWaterfall.spanListAriaLabel', {
  defaultMessage: 'Trace spans',
});

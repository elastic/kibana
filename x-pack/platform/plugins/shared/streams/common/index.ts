/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { Asset, AssetType } from './assets';
export type {
  ProcessorSuggestion,
  ProcessorPropertySuggestion,
  ProcessorSuggestionsResponse,
} from './ingest_processor_suggestions';

export {
  STREAMS_TIERED_FEATURES,
  STREAMS_TIERED_ML_FEATURE,
  STREAMS_TIERED_AI_FEATURE,
  STREAMS_TIERED_SIGNIFICANT_EVENT_FEATURE,
  ATTACHMENT_SUGGESTIONS_LIMIT,
  // Agent Builder / Onechat integration
  STREAMS_ATTACHMENT_TYPE_ID,
  STREAMS_SUGGEST_PARTITIONS_TOOL_ID,
  STREAMS_GET_STREAM_DETAILS_TOOL_ID,
  STREAMS_GET_PROCESSING_STEPS_TOOL_ID,
  STREAMS_SUGGEST_GROK_PATTERN_TOOL_ID,
  STREAMS_SUGGEST_DISSECT_PATTERN_TOOL_ID,
} from './constants';

export {
  excludeFrozenQuery,
  kqlQuery,
  rangeQuery,
  isKqlQueryValid,
  buildEsqlFilter,
} from './query_helpers';

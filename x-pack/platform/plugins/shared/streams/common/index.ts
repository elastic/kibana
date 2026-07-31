/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type {
  ProcessorSuggestion,
  ProcessorPropertySuggestion,
  ProcessorSuggestionsResponse,
} from './ingest_processor_suggestions';

export {
  STREAMS_SIGNIFICANT_EVENTS_AVAILABLE_FLAG,
  STREAMS_SIGNIFICANT_EVENTS_SEMANTIC_CODE_SEARCH_GROUNDING_ENABLED_FLAG,
} from './feature_flags';

export {
  STREAMS_TIERED_FEATURES,
  STREAMS_TIERED_ML_FEATURE,
  STREAMS_TIERED_AI_FEATURE,
  ATTACHMENT_SUGGESTIONS_LIMIT,
  FAILURE_STORE_SELECTOR,
} from './constants';

export type { StreamDocsStat } from './doc_counts';
export {
  excludeFrozenQuery,
  kqlQuery,
  rangeQuery,
  isKqlQueryValid,
  buildEsqlFilter,
} from './query_helpers';

export {
  PRIORITIZED_CONTENT_FIELDS,
  getDefaultTextField,
  extractMessagesFromField,
} from './pattern_extraction_helpers';

export {
  type StreamsAppLocation,
  type StreamsAppLocationParams,
  getStreamsLocation,
} from './get_streams_location/get_streams_location';

export type { StreamSummary } from './stream_summary';
export type { PaginatedResponse } from './pagination';

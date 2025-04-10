/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  STREAMS_AI_GROK_SUGGESTION_ACCEPTED_EVENT_TYPE,
  STREAMS_AI_GROK_SUGGESTION_LATENCY_EVENT_TYPE,
  STREAMS_ASSET_CLICK_EVENT_TYPE,
  STREAMS_ASSET_COUNT_EVENT_TYPE,
} from './constants';
import {
  streamsAIGrokSuggestionAcceptedSchema,
  streamsAIGrokSuggestionLatencySchema,
  streamsAssetClickEventSchema,
  streamsAssetCountSchema,
} from './schemas';

const streamsAssetCountEventType = {
  eventType: STREAMS_ASSET_COUNT_EVENT_TYPE,
  schema: streamsAssetCountSchema,
};

const streamsAssetClickEventType = {
  eventType: STREAMS_ASSET_CLICK_EVENT_TYPE,
  schema: streamsAssetClickEventSchema,
};

const streamsAIGrokSuggestionLatencyEventType = {
  eventType: STREAMS_AI_GROK_SUGGESTION_LATENCY_EVENT_TYPE,
  schema: streamsAIGrokSuggestionLatencySchema,
};

const streamsAIGrokSuggestionAcceptedEventType = {
  eventType: STREAMS_AI_GROK_SUGGESTION_ACCEPTED_EVENT_TYPE,
  schema: streamsAIGrokSuggestionAcceptedSchema,
};

export {
  streamsAssetCountEventType,
  streamsAssetClickEventType,
  streamsAIGrokSuggestionLatencyEventType,
  streamsAIGrokSuggestionAcceptedEventType,
};

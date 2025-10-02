/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const STREAMS_ASSET_COUNT_EVENT_TYPE = 'streams-asset-count';
const STREAMS_ASSET_CLICK_EVENT_TYPE = 'streams-asset-click';
const STREAMS_AI_GROK_SUGGESTION_LATENCY_EVENT_TYPE = 'streams-ai-grok-suggestion-latency';
const STREAMS_AI_GROK_SUGGESTION_ACCEPTED_EVENT_TYPE = 'streams-ai-grok-suggestion-accepted';
const STREAMS_WIRED_STREAMS_STATUS_CHANGED_EVENT_TYPE = 'streams-wired-streams-status-changed';
const STREAMS_PROCESSING_SAVED_EVENT_TYPE = 'streams-processing-saved';
const STREAMS_RETENTION_CHANGED_EVENT_TYPE = 'streams-retention-changed';
const STREAMS_CHILD_STREAM_CREATED_EVENT_TYPE = 'streams-child-stream-created';
const STREAMS_SCHEMA_UPDATED_EVENT_TYPE = 'streams-schema-updated';
const STREAMS_SIGNIFICANT_EVENTS_SUGGESTIONS_GENERATED_EVENT_TYPE =
  'streams-significant-events-suggestions-generated';
const STREAMS_SIGNIFICANT_EVENTS_CREATED_EVENT_TYPE = 'streams-significant-events-created';

export {
  STREAMS_ASSET_COUNT_EVENT_TYPE,
  STREAMS_ASSET_CLICK_EVENT_TYPE,
  STREAMS_AI_GROK_SUGGESTION_LATENCY_EVENT_TYPE,
  STREAMS_AI_GROK_SUGGESTION_ACCEPTED_EVENT_TYPE,
  STREAMS_PROCESSING_SAVED_EVENT_TYPE,
  STREAMS_RETENTION_CHANGED_EVENT_TYPE,
  STREAMS_CHILD_STREAM_CREATED_EVENT_TYPE,
  STREAMS_SCHEMA_UPDATED_EVENT_TYPE,
  STREAMS_SIGNIFICANT_EVENTS_SUGGESTIONS_GENERATED_EVENT_TYPE,
  STREAMS_SIGNIFICANT_EVENTS_CREATED_EVENT_TYPE,
  STREAMS_WIRED_STREAMS_STATUS_CHANGED_EVENT_TYPE,
};

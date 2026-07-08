/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  STREAMS_ENDPOINT_LATENCY_EVENT,
  STREAMS_STATE_ERROR_EVENT,
  STREAMS_DESCRIPTION_GENERATED_EVENT_TYPE,
  STREAMS_PROCESSING_PIPELINE_SUGGESTED_EVENT_TYPE,
  STREAMS_AGENT_TOOL_EVENT_CREATE_EVENT_TYPE,
} from './constants';
import {
  streamsEndpointLatencySchema,
  streamsStateErrorSchema,
  streamsDescriptionGeneratedSchema,
  streamsProcessingPipelineSuggestedSchema,
  streamsAgentToolEventCreateSchema,
} from './schemas';

const streamsEndpointLatencyEventType = {
  eventType: STREAMS_ENDPOINT_LATENCY_EVENT,
  schema: streamsEndpointLatencySchema,
};

const streamsStateErrorEventType = {
  eventType: STREAMS_STATE_ERROR_EVENT,
  schema: streamsStateErrorSchema,
};

const streamsDescriptionGeneratedEventType = {
  eventType: STREAMS_DESCRIPTION_GENERATED_EVENT_TYPE,
  schema: streamsDescriptionGeneratedSchema,
};

const streamsProcessingPipelineSuggestedEventType = {
  eventType: STREAMS_PROCESSING_PIPELINE_SUGGESTED_EVENT_TYPE,
  schema: streamsProcessingPipelineSuggestedSchema,
};

const streamsAgentToolEventCreateEventType = {
  eventType: STREAMS_AGENT_TOOL_EVENT_CREATE_EVENT_TYPE,
  schema: streamsAgentToolEventCreateSchema,
};

export {
  streamsEndpointLatencyEventType,
  streamsStateErrorEventType,
  streamsDescriptionGeneratedEventType,
  streamsProcessingPipelineSuggestedEventType,
  streamsAgentToolEventCreateEventType,
};

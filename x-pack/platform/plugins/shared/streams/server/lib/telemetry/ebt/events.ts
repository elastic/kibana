/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  STREAMS_ENDPOINT_LATENCY_EVENT,
  STREAMS_STATE_ERROR_EVENT,
  STREAMS_PROCESSING_PIPELINE_SUGGESTED_EVENT_TYPE,
} from './constants';
import {
  streamsEndpointLatencySchema,
  streamsStateErrorSchema,
  streamsProcessingPipelineSuggestedSchema,
} from './schemas';

const streamsEndpointLatencyEventType = {
  eventType: STREAMS_ENDPOINT_LATENCY_EVENT,
  schema: streamsEndpointLatencySchema,
};

const streamsStateErrorEventType = {
  eventType: STREAMS_STATE_ERROR_EVENT,
  schema: streamsStateErrorSchema,
};

const streamsProcessingPipelineSuggestedEventType = {
  eventType: STREAMS_PROCESSING_PIPELINE_SUGGESTED_EVENT_TYPE,
  schema: streamsProcessingPipelineSuggestedSchema,
};

export {
  streamsEndpointLatencyEventType,
  streamsStateErrorEventType,
  streamsProcessingPipelineSuggestedEventType,
};

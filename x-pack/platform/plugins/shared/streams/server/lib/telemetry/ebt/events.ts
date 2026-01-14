/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  STREAMS_ENDPOINT_LATENCY_EVENT,
  STREAMS_STATE_ERROR_EVENT,
  STREAMS_SYSTEM_IDENTIFICATION_IDENTIFIED_EVENT_TYPE,
  STREAMS_DESCRIPTION_GENERATED_EVENT_TYPE,
  STREAMS_SIGNIFICANT_EVENTS_QUERIES_GENERATED_EVENT_TYPE,
} from './constants';
import {
  streamsEndpointLatencySchema,
  streamsStateErrorSchema,
  streamsSystemIdentificationIdentifiedSchema,
  streamsDescriptionGeneratedSchema,
  streamsSignificantEventsQueriesGeneratedSchema,
} from './schemas';

const streamsEndpointLatencyEventType = {
  eventType: STREAMS_ENDPOINT_LATENCY_EVENT,
  schema: streamsEndpointLatencySchema,
};

const streamsStateErrorEventType = {
  eventType: STREAMS_STATE_ERROR_EVENT,
  schema: streamsStateErrorSchema,
};

const streamsSystemIdentificationIdentifiedEventType = {
  eventType: STREAMS_SYSTEM_IDENTIFICATION_IDENTIFIED_EVENT_TYPE,
  schema: streamsSystemIdentificationIdentifiedSchema,
};

const streamsDescriptionGeneratedEventType = {
  eventType: STREAMS_DESCRIPTION_GENERATED_EVENT_TYPE,
  schema: streamsDescriptionGeneratedSchema,
};
const streamsSignificantEventsGeneratedEventType = {
  eventType: STREAMS_SIGNIFICANT_EVENTS_QUERIES_GENERATED_EVENT_TYPE,
  schema: streamsSignificantEventsQueriesGeneratedSchema,
};

export {
  streamsEndpointLatencyEventType,
  streamsStateErrorEventType,
  streamsSystemIdentificationIdentifiedEventType,
  streamsDescriptionGeneratedEventType,
  streamsSignificantEventsGeneratedEventType,
};

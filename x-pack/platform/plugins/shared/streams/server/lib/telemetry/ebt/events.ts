/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { STREAMS_ENDPOINT_LATENCY_EVENT } from './constants';
import { streamsEndpointLatencySchema } from './schemas';

const streamsEndpointLatencyEventType = {
  eventType: STREAMS_ENDPOINT_LATENCY_EVENT,
  schema: streamsEndpointLatencySchema,
};

export { streamsEndpointLatencyEventType };

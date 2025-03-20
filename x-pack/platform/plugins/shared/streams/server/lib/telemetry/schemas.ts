/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RootSchema } from '@elastic/ebt/client';
import { StreamEndpointLatencyProps } from './types';

const streamsEndpointLatencySchema: RootSchema<StreamEndpointLatencyProps> = {
  name: {
    type: 'keyword',
    _meta: {
      description: 'The name of the Stream',
    },
  },
  endpoint: {
    type: 'keyword',
    _meta: {
      description: 'The name of the Streams endpoint',
    },
  },
  duration_ms: {
    type: 'long',
    _meta: {
      description: 'The duration of the endpoint in milliseconds',
    },
  },
};

export { streamsEndpointLatencySchema };

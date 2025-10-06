/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@elastic/ebt/client';
import type { StreamEndpointLatencyProps, StreamsStateErrorProps } from './types';

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

const streamsStateErrorSchema: RootSchema<StreamsStateErrorProps> = {
  error: {
    properties: {
      name: {
        type: 'keyword',
        _meta: {
          description: 'The name of the error class',
        },
      },
      message: {
        type: 'text',
        _meta: {
          description: 'The error message',
        },
      },
      stack_trace: {
        type: 'text',
        _meta: {
          description: 'The error stack trace',
          optional: true,
        },
      },
    },
  },
  status_code: {
    type: 'long',
    _meta: {
      description: 'The HTTP status code associated with the error',
    },
  },
};

export { streamsEndpointLatencySchema, streamsStateErrorSchema };

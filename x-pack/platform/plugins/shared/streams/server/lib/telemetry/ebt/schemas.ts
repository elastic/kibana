/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@elastic/ebt/client';
import type {
  StreamEndpointLatencyProps,
  StreamsSystemIdentificationIdentifiedProps,
  StreamsDescriptionGeneratedProps,
  StreamsSignificantEventsQueriesGeneratedProps,
  StreamsInsightsGeneratedProps,
  StreamsStateErrorProps,
  StreamsProcessingPipelineSuggestedProps,
} from './types';

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

const streamsSystemIdentificationIdentifiedSchema: RootSchema<StreamsSystemIdentificationIdentifiedProps> =
  {
    count: {
      type: 'long',
      _meta: {
        description: 'The number of systems identified',
      },
    },
    input_tokens_used: {
      type: 'long',
      _meta: {
        description: 'The number of input tokens used for the generation request',
      },
    },
    output_tokens_used: {
      type: 'long',
      _meta: {
        description: 'The number of output tokens used for the generation request',
      },
    },
    stream_type: {
      type: 'keyword',
      _meta: {
        description: 'The type of the stream: wired or classic',
      },
    },
    stream_name: {
      type: 'keyword',
      _meta: {
        description: 'The name of the Stream',
      },
    },
  };

const streamsDescriptionGeneratedSchema: RootSchema<StreamsDescriptionGeneratedProps> = {
  input_tokens_used: {
    type: 'long',
    _meta: {
      description: 'The number of input tokens used for the generation request',
    },
  },
  output_tokens_used: {
    type: 'long',
    _meta: {
      description: 'The number of output tokens used for the generation request',
    },
  },
  stream_type: {
    type: 'keyword',
    _meta: {
      description: 'The type of the stream: wired or classic',
    },
  },
  stream_name: {
    type: 'keyword',
    _meta: {
      description: 'The name of the Stream',
    },
  },
};

const streamsSignificantEventsQueriesGeneratedSchema: RootSchema<StreamsSignificantEventsQueriesGeneratedProps> =
  {
    count: {
      type: 'long',
      _meta: {
        description: 'The number of significant events queries generated',
      },
    },
    systems_count: {
      type: 'long',
      _meta: {
        description: 'The number of systems used to generate the queries',
      },
    },
    input_tokens_used: {
      type: 'long',
      _meta: {
        description: 'The number of input tokens used for the generation request',
      },
    },
    output_tokens_used: {
      type: 'long',
      _meta: {
        description: 'The number of output tokens used for the generation request',
      },
    },
    stream_type: {
      type: 'keyword',
      _meta: {
        description: 'The type of the stream: wired or classic',
      },
    },
    stream_name: {
      type: 'keyword',
      _meta: {
        description: 'The name of the Stream',
      },
    },
  };

const streamsInsightsGeneratedSchema: RootSchema<StreamsInsightsGeneratedProps> = {
  input_tokens_used: {
    type: 'long',
    _meta: {
      description: 'The number of input tokens used for the generation request',
    },
  },
  output_tokens_used: {
    type: 'long',
    _meta: {
      description: 'The number of output tokens used for the generation request',
    },
  },
  cached_tokens_used: {
    type: 'long',
    _meta: {
      description: 'The number of cached tokens used for the generation request',
      optional: true,
    },
  },
};

const streamsProcessingPipelineSuggestedSchema: RootSchema<StreamsProcessingPipelineSuggestedProps> =
  {
    duration_ms: {
      type: 'long',
      _meta: {
        description: 'The duration of the pipeline suggestion generation in milliseconds',
      },
    },
    steps_used: {
      type: 'long',
      _meta: {
        description: 'The number of reasoning steps the LLM took to generate the suggestion',
      },
    },
    success: {
      type: 'boolean',
      _meta: {
        description: 'Whether the pipeline suggestion was generated successfully',
      },
    },
    stream_type: {
      type: 'keyword',
      _meta: {
        description: 'The type of the stream: wired or classic',
      },
    },
    stream_name: {
      type: 'keyword',
      _meta: {
        description: 'The name of the Stream',
      },
    },
  };

export {
  streamsEndpointLatencySchema,
  streamsStateErrorSchema,
  streamsSystemIdentificationIdentifiedSchema,
  streamsDescriptionGeneratedSchema,
  streamsSignificantEventsQueriesGeneratedSchema,
  streamsInsightsGeneratedSchema,
  streamsProcessingPipelineSuggestedSchema,
};

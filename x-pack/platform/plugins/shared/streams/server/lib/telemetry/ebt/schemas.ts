/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@elastic/ebt/client';
import type {
  StreamEndpointLatencyProps,
  StreamsDescriptionGeneratedProps,
  StreamsSignificantEventsQueriesGeneratedProps,
  StreamsInsightsGeneratedProps,
  StreamsStateErrorProps,
  StreamsProcessingPipelineSuggestedProps,
  StreamsFeaturesIdentifiedProps,
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
    tool_usage: {
      properties: {
        get_stream_features: {
          properties: {
            calls: {
              type: 'long',
              _meta: {
                description: 'The number of calls to the get_stream_features tool',
              },
            },
            failures: {
              type: 'long',
              _meta: {
                description: 'The number of failures to the get_stream_features tool',
              },
            },
            latency_ms: {
              type: 'long',
              _meta: {
                description: 'The latency of the get_stream_features tool in milliseconds',
              },
            },
          },
        },
        add_queries: {
          properties: {
            calls: {
              type: 'long',
              _meta: {
                description: 'The number of calls to the add_queries tool',
              },
            },
            failures: {
              type: 'long',
              _meta: {
                description: 'The number of failures to the add_queries tool',
              },
            },
            latency_ms: {
              type: 'long',
              _meta: {
                description: 'The latency of the add_queries tool in milliseconds',
              },
            },
          },
        },
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

const streamsFeaturesIdentifiedSchema: RootSchema<StreamsFeaturesIdentifiedProps> = {
  inferred_total_count: {
    type: 'long',
    _meta: {
      description: 'The total number of inferred features',
    },
  },
  inferred_dedup_count: {
    type: 'long',
    _meta: {
      description: 'The number of inferred features after deduplication',
    },
  },
  input_tokens_used: {
    type: 'long',
    _meta: {
      description: 'The number of input tokens used for the identification request',
    },
  },
  output_tokens_used: {
    type: 'long',
    _meta: {
      description: 'The number of output tokens used for the identification request',
    },
  },
  total_tokens_used: {
    type: 'long',
    _meta: {
      description: 'The total number of tokens used for the identification request',
    },
  },
  excluded_features_count: {
    type: 'long',
    _meta: {
      description: 'The number of excluded features present at the time of identification',
    },
  },
  llm_ignored_count: {
    type: 'long',
    _meta: {
      description: 'The number of features the LLM reported as matching excluded features',
    },
  },
  code_ignored_count: {
    type: 'long',
    _meta: {
      description:
        'The number of inferred features dropped server-side because they matched excluded features',
    },
  },
  total_duration_ms: {
    type: 'long',
    _meta: {
      description: 'The total duration of the features identification task in milliseconds',
    },
  },
  identification_duration_ms: {
    type: 'long',
    _meta: {
      description: 'The duration of the LLM features identification in milliseconds',
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
  state: {
    type: 'keyword',
    _meta: {
      description: 'The state of the features identification task (success, failure, or canceled)',
    },
  },
  filters_capped: {
    type: 'boolean',
    _meta: {
      description: 'Whether the filters were capped',
    },
  },
  total_filters: {
    type: 'long',
    _meta: {
      description: 'The total number of filters available in features',
    },
  },
  has_filtered_documents: {
    type: 'boolean',
    _meta: {
      description: 'Whether the sample query found documents after filters were applied',
    },
  },
};

export {
  streamsEndpointLatencySchema,
  streamsStateErrorSchema,
  streamsDescriptionGeneratedSchema,
  streamsSignificantEventsQueriesGeneratedSchema,
  streamsInsightsGeneratedSchema,
  streamsProcessingPipelineSuggestedSchema,
  streamsFeaturesIdentifiedSchema,
};

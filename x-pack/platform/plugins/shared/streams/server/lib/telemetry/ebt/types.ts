/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamType } from '@kbn/streams-schema';

interface StreamEndpointLatencyProps {
  name: string;
  endpoint: string;
  duration_ms: number;
}

interface StreamsStateErrorProps {
  error: {
    name: string;
    message: string;
    stack_trace?: string;
  };
  status_code: number;
}

interface StreamsDescriptionGeneratedProps {
  input_tokens_used: number;
  output_tokens_used: number;
  stream_name: string;
  stream_type: StreamType;
}

interface StreamsProcessingPipelineSuggestedProps {
  duration_ms: number;
  steps_used: number;
  success: boolean;
  stream_name: string;
  stream_type: StreamType;
}

interface StreamsAgentToolEventCreateProps {
  success: boolean;
  stream_names: string[];
  error_message?: string;
}

export {
  type StreamEndpointLatencyProps,
  type StreamsStateErrorProps,
  type StreamsDescriptionGeneratedProps,
  type StreamsProcessingPipelineSuggestedProps,
  type StreamsAgentToolEventCreateProps,
};

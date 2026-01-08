/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeatureType, StreamType } from '@kbn/streams-schema';

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

type CountByFeatureType = Record<FeatureType, number>;

interface StreamsFeatureIdentificationIdentifiedProps {
  count: number;
  count_by_type: CountByFeatureType;
  input_tokens_used: number;
  output_tokens_used: number;
  stream_name: string;
  stream_type: StreamType;
}

export {
  type StreamEndpointLatencyProps,
  type StreamsStateErrorProps,
  type StreamsFeatureIdentificationIdentifiedProps,
};

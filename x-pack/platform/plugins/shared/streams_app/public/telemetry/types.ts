/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

type StreamType = 'wired' | 'classic' | 'unknown';

interface StreamsAssetCountProps {
  name: string;
  dashboards: number;
  slos?: number;
  rules?: number;
}

interface StreamsAssetClickEventProps {
  name: string;
  asset_type: 'dashboard' | 'slo' | 'rule';
  asset_id: string;
}

interface StreamsAIGrokSuggestionLatencyProps {
  name: string;
  field: string;
  connector_id: string;
  suggestion_count: number;
  duration_ms: number;
  match_rate: number[];
}

interface StreamsAIGrokSuggestionAcceptedProps {
  name: string;
  field: string;
  connector_id: string;
  match_rate: number;
  detected_fields: number;
}

interface WiredStreamsStatusChangedProps {
  is_enabled: boolean;
}

interface StreamsProcessingSavedProps {
  processors_count: number;
  stream_type: StreamType;
}

interface StreamsRetentionChangedProps {
  lifecycle_type: 'dsl' | 'ilm' | 'inherit';
  lifecycle_value?: string;
  stream_type: StreamType;
}

interface StreamsChildStreamCreatedProps {
  name: string;
}

interface StreamsSchemaUpdatedProps {
  stream_type: StreamType;
}

interface StreamsSignificantEventsSuggestionsGeneratedEventProps {
  duration_ms: number;
  stream_type: StreamType;
}

interface StreamsSignificantEventsCreatedProps {
  count: number;
  stream_type: StreamType;
}

export {
  type StreamsAssetCountProps,
  type StreamsAssetClickEventProps,
  type StreamsAIGrokSuggestionLatencyProps,
  type StreamsAIGrokSuggestionAcceptedProps,
  type StreamsRetentionChangedProps,
  type StreamsProcessingSavedProps,
  type StreamsChildStreamCreatedProps,
  type StreamsSchemaUpdatedProps,
  type StreamsSignificantEventsSuggestionsGeneratedEventProps,
  type StreamsSignificantEventsCreatedProps,
  type WiredStreamsStatusChangedProps,
};

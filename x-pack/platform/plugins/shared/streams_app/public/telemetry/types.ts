/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

interface StreamsProcessingSavedProps {
  processors_count: number;
}

interface StreamsRetentionChangedProps {
  lifecycle_type: 'dsl' | 'ilm' | 'inherit';
  lifecycle_value?: string;
  stream_type: 'wired' | 'classic';
}

interface StreamsChildStreamCreatedProps {
  name: string;
}

interface StreamsSchemaFieldUpdatedProps {
  field_name: string;
  field_status: 'mapped' | 'unmapped';
  field_type?: string;
  stream_type: 'wired' | 'classic';
}

interface StreamsSignificantEventsSuggestionsGeneratedEventProps {
  duration_ms: number;
  stream_type: 'wired' | 'classic';
}

interface StreamsSignificantEventsCreatedProps {
  count: number;
  stream_type: 'wired' | 'classic';
}

export {
  type StreamsAssetCountProps,
  type StreamsAssetClickEventProps,
  type StreamsAIGrokSuggestionLatencyProps,
  type StreamsAIGrokSuggestionAcceptedProps,
  type StreamsRetentionChangedProps,
  type StreamsProcessingSavedProps,
  type StreamsChildStreamCreatedProps,
  type StreamsSchemaFieldUpdatedProps,
  type StreamsSignificantEventsSuggestionsGeneratedEventProps,
  type StreamsSignificantEventsCreatedProps,
};

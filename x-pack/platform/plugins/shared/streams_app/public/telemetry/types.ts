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

export {
  type StreamsAssetCountProps,
  type StreamsAssetClickEventProps,
  type StreamsAIGrokSuggestionLatencyProps,
  type StreamsAIGrokSuggestionAcceptedProps,
};

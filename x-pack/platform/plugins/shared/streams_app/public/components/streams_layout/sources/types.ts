/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit, StreamsV2 } from '@kbn/streams-schema';

type UnitSourceTelemetry = NonNullable<
  StreamsUnit.Configuration['sources']
>[number]['supported_telemetry'];

export type SourceType = Extract<
  StreamsV2.SourceType,
  | 'otlp'
  | 'es_otlp'
  | 'async_bulk'
  | 'prometheus_remote_write'
  | 'es_prometheus_remote_write'
  | 'bulk'
>;

export type ConfiguredSource = Extract<StreamsV2.Source, { type: SourceType }>;

export interface SourceApiKey {
  id: string;
  name: string;
  createdAt: string;
}

export interface SourceEndpoint {
  id: 'default' | 'logs' | 'metrics' | 'traces';
  url: string;
}

export interface SourceRuntimeMetadata {
  endpoint?: string;
  endpoints: SourceEndpoint[];
  destinations: string[];
}

export type SourceViewModel = ConfiguredSource &
  SourceRuntimeMetadata & {
    apiKeys: SourceApiKey[];
    supportedTelemetry?: UnitSourceTelemetry;
  };

export interface RevealedApiKey extends SourceApiKey {
  encoded: string;
}

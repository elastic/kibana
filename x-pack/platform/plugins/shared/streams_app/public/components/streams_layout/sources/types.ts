/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsV2 } from '@kbn/streams-schema';

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

export interface SourcesUnitDefinition extends Omit<StreamsV2.UnitDefinition, 'sources'> {
  sources: ConfiguredSource[];
}

export type SourceStatus = 'live' | 'provisioning' | 'failed';

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
  throughput?: string;
  lastEvent?: string;
  destinations: string[];
}

export type SourceViewModel = ConfiguredSource &
  SourceRuntimeMetadata & {
    apiKeys: SourceApiKey[];
    status: SourceStatus;
  };

export interface RevealedApiKey extends SourceApiKey {
  encoded: string;
}

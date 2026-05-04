/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface OtlpEndpointConfig {
  id: string;
  name: string;
  targetStreamName?: string;
  createdAt: number;
  updatedAt: number;
}

export interface OtlpEndpointHealth {
  id: string;
  status: 'healthy' | 'degraded' | 'down';
  message?: string;
}

export interface OtlpEndpointThroughput {
  id: string;
  docsPerSec: number;
  bytesPerSec?: number;
}

export interface OtlpEdgeThroughput {
  endpointId: string;
  streamName: string;
  docsPerSec: number;
}

export interface PipelineMetricsResult {
  perPipeline: Record<string, OtlpEndpointThroughput>;
  perEdge: Record<string, OtlpEdgeThroughput>; // key: `${endpointId}->${streamName}`
  health: Record<string, OtlpEndpointHealth>;
}

export interface ICloudPipelinesClient {
  list(): Promise<OtlpEndpointConfig[]>;
  get(id: string): Promise<OtlpEndpointConfig | undefined>;
  create(
    input: Omit<OtlpEndpointConfig, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<OtlpEndpointConfig>;
  update(
    id: string,
    patch: Partial<Omit<OtlpEndpointConfig, 'id' | 'createdAt'>>
  ): Promise<OtlpEndpointConfig>;
  delete(id: string): Promise<void>;
  duplicate(id: string): Promise<OtlpEndpointConfig>;
  getMetrics(now: number, availableStreamNames: string[]): Promise<PipelineMetricsResult>;
}

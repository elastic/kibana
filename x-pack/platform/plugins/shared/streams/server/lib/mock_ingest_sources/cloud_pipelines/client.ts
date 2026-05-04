/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generatePipelineMetrics } from './metrics';
import type { CloudPipelinesStore } from './storage';
import type { ICloudPipelinesClient, OtlpEndpointConfig, PipelineMetricsResult } from './types';

export class CloudPipelinesMockClient implements ICloudPipelinesClient {
  constructor(private readonly store: CloudPipelinesStore) {}

  async list(): Promise<OtlpEndpointConfig[]> {
    return this.store.list();
  }

  async get(id: string): Promise<OtlpEndpointConfig | undefined> {
    return this.store.get(id);
  }

  async create(
    input: Omit<OtlpEndpointConfig, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<OtlpEndpointConfig> {
    return this.store.create(input);
  }

  async update(
    id: string,
    patch: Partial<Omit<OtlpEndpointConfig, 'id' | 'createdAt'>>
  ): Promise<OtlpEndpointConfig> {
    return this.store.update(id, patch);
  }

  async delete(id: string): Promise<void> {
    return this.store.delete(id);
  }

  async duplicate(id: string): Promise<OtlpEndpointConfig> {
    return this.store.duplicate(id);
  }

  async getMetrics(now: number, availableStreamNames: string[]): Promise<PipelineMetricsResult> {
    const pipelines = this.store.list();
    return generatePipelineMetrics(pipelines, now, availableStreamNames);
  }
}

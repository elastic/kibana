/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { OtlpEndpointConfig } from './types';

export class CloudPipelinesStore {
  private readonly store = new Map<string, OtlpEndpointConfig>();

  list(): OtlpEndpointConfig[] {
    return Array.from(this.store.values());
  }

  get(id: string): OtlpEndpointConfig | undefined {
    return this.store.get(id);
  }

  create(input: Omit<OtlpEndpointConfig, 'id' | 'createdAt' | 'updatedAt'>): OtlpEndpointConfig {
    const now = Date.now();
    const config: OtlpEndpointConfig = {
      ...input,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(config.id, config);
    return config;
  }

  update(
    id: string,
    patch: Partial<Omit<OtlpEndpointConfig, 'id' | 'createdAt'>>
  ): OtlpEndpointConfig {
    const existing = this.store.get(id);
    if (!existing) {
      throw new Error(`Cloud pipeline with id "${id}" not found`);
    }
    const updated: OtlpEndpointConfig = {
      ...existing,
      ...patch,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: Date.now(),
    };
    this.store.set(id, updated);
    return updated;
  }

  delete(id: string): void {
    if (!this.store.has(id)) {
      throw new Error(`Cloud pipeline with id "${id}" not found`);
    }
    this.store.delete(id);
  }

  duplicate(id: string): OtlpEndpointConfig {
    const existing = this.store.get(id);
    if (!existing) {
      throw new Error(`Cloud pipeline with id "${id}" not found`);
    }
    return this.create({
      name: `${existing.name} (copy)`,
      targetStreamName: existing.targetStreamName,
    });
  }

  isEmpty(): boolean {
    return this.store.size === 0;
  }
}

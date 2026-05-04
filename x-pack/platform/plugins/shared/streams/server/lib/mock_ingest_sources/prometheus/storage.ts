/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { PrometheusScraper } from './types';

export class PrometheusStore {
  private readonly store = new Map<string, PrometheusScraper>();

  list(): PrometheusScraper[] {
    return Array.from(this.store.values());
  }

  get(id: string): PrometheusScraper | undefined {
    return this.store.get(id);
  }

  create(input: Omit<PrometheusScraper, 'id' | 'createdAt' | 'updatedAt'>): PrometheusScraper {
    const now = Date.now();
    const scraper: PrometheusScraper = {
      ...input,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(scraper.id, scraper);
    return scraper;
  }

  update(
    id: string,
    patch: Partial<Omit<PrometheusScraper, 'id' | 'createdAt'>>
  ): PrometheusScraper {
    const existing = this.store.get(id);
    if (!existing) {
      throw new Error(`Prometheus scraper with id "${id}" not found`);
    }
    const updated: PrometheusScraper = {
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
      throw new Error(`Prometheus scraper with id "${id}" not found`);
    }
    this.store.delete(id);
  }

  isEmpty(): boolean {
    return this.store.size === 0;
  }
}

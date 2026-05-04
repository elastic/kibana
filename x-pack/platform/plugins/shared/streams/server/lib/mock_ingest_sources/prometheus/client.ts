/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateScraperMetrics } from './metrics';
import type { PrometheusStore } from './storage';
import type { IPrometheusMockClient, PrometheusScraper, ScraperMetricsResult } from './types';

export class PrometheusMockClient implements IPrometheusMockClient {
  constructor(private readonly store: PrometheusStore) {}

  async list(): Promise<PrometheusScraper[]> {
    return this.store.list();
  }

  async get(id: string): Promise<PrometheusScraper | undefined> {
    return this.store.get(id);
  }

  async create(
    input: Omit<PrometheusScraper, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<PrometheusScraper> {
    return this.store.create(input);
  }

  async update(
    id: string,
    patch: Partial<Omit<PrometheusScraper, 'id' | 'createdAt'>>
  ): Promise<PrometheusScraper> {
    return this.store.update(id, patch);
  }

  async delete(id: string): Promise<void> {
    return this.store.delete(id);
  }

  async getMetrics(now: number): Promise<ScraperMetricsResult> {
    const scrapers = this.store.list();
    return generateScraperMetrics(scrapers, now);
  }
}

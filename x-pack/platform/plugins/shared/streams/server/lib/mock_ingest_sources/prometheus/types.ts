/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface PrometheusScraper {
  id: string;
  name: string;
  targetHost: string;
  scrapeIntervalSec: 15 | 30 | 60;
  destination: { kind: 'cloudPipeline'; pipelineId: string } | { kind: 'bulkEndpoint' };
  createdAt: number;
  updatedAt: number;
}

export interface PrometheusScraperHealth {
  id: string;
  status: 'healthy' | 'degraded' | 'down';
  message?: string;
}

export interface ScraperMetricsResult {
  perScraper: Record<string, { docsPerSec: number; bytesPerSec: number }>;
  health: Record<string, PrometheusScraperHealth>;
}

export interface IPrometheusMockClient {
  list(): Promise<PrometheusScraper[]>;
  get(id: string): Promise<PrometheusScraper | undefined>;
  create(
    input: Omit<PrometheusScraper, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<PrometheusScraper>;
  update(
    id: string,
    patch: Partial<Omit<PrometheusScraper, 'id' | 'createdAt'>>
  ): Promise<PrometheusScraper>;
  delete(id: string): Promise<void>;
  getMetrics(now: number): Promise<ScraperMetricsResult>;
}

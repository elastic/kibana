/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hashString, noisyRate, seededHealth, seededRandom } from '../shared/seeded_noise';
import type { PrometheusScraperHealth, ScraperMetricsResult } from './types';
import type { PrometheusScraper } from './types';

export const generateScraperMetrics = (
  scrapers: PrometheusScraper[],
  now: number
): ScraperMetricsResult => {
  const bucketTime = Math.floor(now / 5000);

  const perScraper: Record<string, { docsPerSec: number; bytesPerSec: number }> = {};
  const health: Record<string, PrometheusScraperHealth> = {};

  for (const scraper of scrapers) {
    const { id, scrapeIntervalSec } = scraper;

    // Base docs/sec derived from scrape interval — higher frequency = more docs
    const intervalFactor = 60 / scrapeIntervalSec; // 15s→4, 30s→2, 60s→1
    const baseRate = seededRandom(hashString(id)) * 400 * intervalFactor + 50;
    const docsPerSec = noisyRate(baseRate, id, bucketTime);
    const bytesPerSec = docsPerSec * (200 + seededRandom(hashString(`${id}:bytes`)) * 150);

    const status = seededHealth(id, bucketTime);

    perScraper[id] = { docsPerSec, bytesPerSec };
    health[id] = { id, status };
  }

  return { perScraper, health };
};

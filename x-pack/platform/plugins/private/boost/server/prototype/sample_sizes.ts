/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The sample indices and data streams hold only a few KB, and serverless index stats don't report
// object-store sizes, so cost estimates would round to nothing. These illustrative sizes make the
// estimates read like a real project's.
export const SAMPLE_DATA_SIZES_GB: Readonly<Record<string, number>> = {
  products: 12,
  'catalog-2026-spring': 4,
  'catalog-2026-fall': 4,
  'archive-2024': 80,
  'archive-2025': 60,
  synonyms: 0.05,
  users: 2,
  'logs-checkout-default': 150,
  'logs-search-default': 90,
  'metrics-hosts-default': 40,
  'clicks-web': 200,
  'clicks-mobile': 120,
  'events-app': 30,
};

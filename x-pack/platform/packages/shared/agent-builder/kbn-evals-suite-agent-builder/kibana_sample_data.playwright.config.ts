/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Path from 'path';
import { createPlaywrightEvalsConfig } from '@kbn/evals';

/**
 * NL → ES|QL evals for Kibana’s built-in sample data only.
 * Install "Sample flight data", "Sample eCommerce", and "Sample web logs" in Kibana before running.
 * Does not run as part of `esql.playwright.config.ts` (synthetic `evals/esql` set).
 */
export default createPlaywrightEvalsConfig({
  testDir: Path.resolve(__dirname, './evals/kibana_sample_data'),
  repetitions: 1,
  timeout: 30 * 60_000,
});

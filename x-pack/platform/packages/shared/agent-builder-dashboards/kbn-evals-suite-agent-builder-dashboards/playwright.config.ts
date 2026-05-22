/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { createPlaywrightEvalsConfig } from '@kbn/evals';

// Set a fallback EVALUATION_CONNECTOR_ID if not provided
// This is needed for the evals framework even when using custom CODE evaluators
if (!process.env.EVALUATION_CONNECTOR_ID) {
  // Use the first available project connector as fallback
  // Custom CODE evaluators don't actually use this, but the framework requires it
  process.env.EVALUATION_CONNECTOR_ID = 'azure-gpt-5-chat';
}

export default createPlaywrightEvalsConfig({
  testDir: Path.resolve(__dirname, './evals'),
  repetitions: 1,
  timeout: 4 * 60 * 60_000,
});

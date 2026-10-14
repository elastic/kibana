/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook } from '@kbn/scout';

globalSetupHook('Setup environment for Streams API tests', async ({ kbnClient, esClient, log }) => {
  log.debug('[setup] Enabling Streams...');

  try {
    await kbnClient.request({
      method: 'POST',
      path: '/api/streams/_enable',
    });
    log.debug('[setup] Streams enabled successfully');
  } catch (error) {
    log.debug(`[setup] Streams may already be enabled: ${error}`);
  }

  // Index documents to both 'logs.otel' and 'logs.ecs' streams to initialize the data streams
  // This is required for the processing simulation API to work, as it needs
  // data streams with at least one index to simulate against
  // Both streams are guaranteed to exist after enableStreams() in fresh installations

  log.debug('[setup] Indexing test documents to logs.otel and logs.ecs streams...');
  try {
    await Promise.all([
      esClient.index({
        index: 'logs.otel',
        document: {
          '@timestamp': new Date().toISOString(),
          'body.text': 'Test document for streams API tests',
        },
        refresh: true,
      }),
      esClient.index({
        index: 'logs.ecs',
        document: {
          '@timestamp': new Date().toISOString(),
          message: 'Test document for streams API tests',
        },
        refresh: true,
      }),
    ]);
    log.debug('[setup] Test documents indexed successfully');
  } catch (error) {
    throw new Error(
      `[setup] Failed to index test documents - this is required for processing simulation tests: ${error}`
    );
  }
});

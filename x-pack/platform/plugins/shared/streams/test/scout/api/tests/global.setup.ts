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

  // Index a document to the 'logs' stream to initialize the data stream
  // This is required for the processing simulation API to work, as it needs
  // a data stream with at least one index to simulate against

  log.debug('[setup] Indexing test document to logs stream...');
  try {
    await esClient.index({
      index: 'logs',
      document: {
        '@timestamp': new Date().toISOString(),
        log: { message: 'Test document for streams API tests' },
      },
      refresh: true,
    });
    log.debug('[setup] Test document indexed successfully');
  } catch (error) {
    throw new Error(
      `[setup] Failed to index test document - this is required for processing simulation tests: ${error}`
    );
  }
});

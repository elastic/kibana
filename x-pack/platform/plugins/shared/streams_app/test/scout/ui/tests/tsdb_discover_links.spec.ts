/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type EsClient } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import { generateLogsData } from '../fixtures/generators';

// TSDB-compatible stream names
const TSDB_STREAM_NAME = 'metrics-tsdb-test';
const TSDB_TEMPLATE_NAME = 'metrics-tsdb-test-template';

// Regular (non-TSDB) stream for comparison
const REGULAR_STREAM_NAME = 'logs-regular-test';

/**
 * Creates a TSDB-compatible index template with time series dimensions and metrics
 */
async function createTsdbIndexTemplate(esClient: EsClient, templateName: string, pattern: string) {
  await esClient.indices.putIndexTemplate({
    name: templateName,
    index_patterns: [pattern],
    priority: 2000,
    data_stream: {},
    template: {
      settings: {
        'index.mode': 'time_series',
      },
      mappings: {
        properties: {
          '@timestamp': {
            type: 'date',
          },
          'host.name': {
            type: 'keyword',
            time_series_dimension: true,
          },
          'service.name': {
            type: 'keyword',
            time_series_dimension: true,
          },
          cpu_usage: {
            type: 'float',
            time_series_metric: 'gauge',
          },
          memory_usage: {
            type: 'float',
            time_series_metric: 'gauge',
          },
          message: {
            type: 'text',
          },
        },
      },
    },
  });
}

/**
 * Indexes sample TSDB data into the data stream
 */
async function indexTsdbData(esClient: EsClient, dataStreamName: string) {
  const now = Date.now();
  const documents = [];

  // Generate 10 documents with different timestamps and dimensions
  for (let i = 0; i < 10; i++) {
    documents.push({
      create: {},
    });
    documents.push({
      '@timestamp': new Date(now - i * 60000).toISOString(),
      'host.name': `host-${i % 3}`,
      'service.name': `service-${i % 2}`,
      cpu_usage: Math.random() * 100,
      memory_usage: Math.random() * 100,
      message: `Test TSDB metric ${i}`,
    });
  }

  await esClient.bulk({
    index: dataStreamName,
    operations: documents,
    refresh: true,
  });
}

/**
 * Cleanup function to delete the TSDB template and data stream
 */
async function cleanupTsdbResources(esClient: EsClient, templateName: string, streamName: string) {
  try {
    await esClient.indices.deleteDataStream({ name: streamName });
  } catch {
    // Ignore errors if data stream doesn't exist
  }

  try {
    await esClient.indices.deleteIndexTemplate({ name: templateName });
  } catch {
    // Ignore errors if template doesn't exist
  }
}

test.describe(
  'TSDB-aware Discover links - Streams list view',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    test.beforeAll(async ({ esClient, logsSynthtraceEsClient }) => {
      // Create TSDB stream
      await createTsdbIndexTemplate(esClient, TSDB_TEMPLATE_NAME, `${TSDB_STREAM_NAME}*`);
      await indexTsdbData(esClient, TSDB_STREAM_NAME);

      // Create regular (non-TSDB) stream for comparison
      const currentTime = Date.now();
      await generateLogsData(logsSynthtraceEsClient)({
        index: REGULAR_STREAM_NAME,
        startTime: new Date(currentTime - 5 * 60 * 1000).toISOString(),
        endTime: new Date(currentTime).toISOString(),
        docsPerMinute: 10,
      });
    });

    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.streams.gotoStreamMainPage();
      await pageObjects.streams.expectStreamsTableVisible();
    });

    test.afterAll(async ({ esClient, apiServices, logsSynthtraceEsClient }) => {
      // Cleanup TSDB resources
      await cleanupTsdbResources(esClient, TSDB_TEMPLATE_NAME, TSDB_STREAM_NAME);

      // Cleanup regular stream
      try {
        await apiServices.streams.deleteStream(REGULAR_STREAM_NAME);
      } catch {
        // Ignore errors if stream doesn't exist
      }
      await logsSynthtraceEsClient.clean();
    });

    test('should use TS source command for TSDB stream Discover link', async ({ pageObjects }) => {
      await expect
        .poll(
          async () => {
            return pageObjects.streams.getDiscoverButtonLinkSourceCommand(TSDB_STREAM_NAME);
          },
          {
            message: 'Expected TSDB stream Discover link to use TS source command',
            timeout: 15_000,
          }
        )
        .toBe('TS');
    });

    test('should use FROM source command for regular stream Discover link', async ({
      pageObjects,
    }) => {
      await expect
        .poll(
          async () => {
            return pageObjects.streams.getDiscoverButtonLinkSourceCommand(REGULAR_STREAM_NAME);
          },
          {
            message: 'Expected regular stream Discover link to use FROM source command',
            timeout: 10_000,
          }
        )
        .toBe('FROM');
    });
  }
);

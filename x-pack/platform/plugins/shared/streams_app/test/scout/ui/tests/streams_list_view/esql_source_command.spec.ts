/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout';
import { test } from '../../fixtures';
import { generateLogsData } from '../../fixtures/generators';

const STANDARD_STREAM = 'logs-standard-esql-test';
const TIME_SERIES_STREAM = 'metrics-tsdb-esql-test';

/**
 * Creates an index template for a time-series (TSDB) data stream.
 * Time-series data streams require dimension fields and proper settings.
 */
async function createTimeSeriesIndexTemplate(esClient: EsClient, streamName: string) {
  await esClient.indices.putIndexTemplate({
    name: `${streamName}-template`,
    index_patterns: [streamName],
    priority: 500, // High priority to override default templates
    data_stream: {},
    template: {
      settings: {
        index: {
          mode: 'time_series',
          routing_path: ['host.name'],
        },
      },
      mappings: {
        properties: {
          '@timestamp': { type: 'date' },
          host: {
            properties: {
              name: { type: 'keyword', time_series_dimension: true },
            },
          },
          cpu: {
            properties: {
              usage: { type: 'double', time_series_metric: 'gauge' },
            },
          },
        },
      },
    },
  });
}

/**
 * Indexes a single document to the time-series data stream.
 */
async function indexTimeSeriesDocument(esClient: EsClient, streamName: string) {
  await esClient.index({
    index: streamName,
    document: {
      '@timestamp': new Date().toISOString(),
      host: { name: 'test-host' },
      cpu: { usage: 50.5 },
    },
    refresh: true,
  });
}

/**
 * Cleans up the time-series data stream and its template.
 */
async function cleanupTimeSeriesStream(esClient: EsClient, streamName: string) {
  try {
    await esClient.indices.deleteDataStream({ name: streamName });
  } catch {
    // Ignore if doesn't exist
  }
  try {
    await esClient.indices.deleteIndexTemplate({ name: `${streamName}-template` });
  } catch {
    // Ignore if doesn't exist
  }
}

test.describe(
  'ESQL source command - Verify FROM vs TS based on index_mode',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    test.beforeAll(async ({ logsSynthtraceEsClient, esClient }) => {
      // Create standard stream with logs data
      await generateLogsData(logsSynthtraceEsClient)({
        index: STANDARD_STREAM,
        startTime: 'now-15m',
        endTime: 'now',
        docsPerMinute: 5,
      });

      // Create time-series stream
      await createTimeSeriesIndexTemplate(esClient, TIME_SERIES_STREAM);
      await indexTimeSeriesDocument(esClient, TIME_SERIES_STREAM);
    });

    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.streams.gotoStreamMainPage();
      await pageObjects.streams.expectStreamsTableVisible();
    });

    test.afterAll(async ({ apiServices, logsSynthtraceEsClient, esClient }) => {
      // Cleanup standard stream
      try {
        await apiServices.streams.deleteStream(STANDARD_STREAM);
      } catch {
        // Ignore cleanup errors
      }
      await logsSynthtraceEsClient.clean();

      // Cleanup time-series stream
      await cleanupTimeSeriesStream(esClient, TIME_SERIES_STREAM);
    });

    test('standard/logsdb streams should use FROM in Discover link', async ({ pageObjects }) => {
      // Verify the standard stream exists in the table
      await pageObjects.streams.verifyStreamsAreInTable([STANDARD_STREAM]);

      // Verify the Discover button uses FROM (not TS)
      await pageObjects.streams.verifyDiscoverButtonSourceCommand(STANDARD_STREAM, 'FROM');
    });

    test('time-series (TSDB) streams should use TS in Discover link', async ({ pageObjects }) => {
      // Verify the time-series stream exists in the table
      await pageObjects.streams.verifyStreamsAreInTable([TIME_SERIES_STREAM]);

      // Verify the Discover button uses TS (not FROM)
      await pageObjects.streams.verifyDiscoverButtonSourceCommand(TIME_SERIES_STREAM, 'TS');
    });
  }
);

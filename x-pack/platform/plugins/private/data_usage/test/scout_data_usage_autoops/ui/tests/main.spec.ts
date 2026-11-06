/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Server } from 'http';
import { expect } from '@kbn/scout/ui';
import {
  test,
  createDataStream,
  deleteDataStream,
  startAutoOpsMock,
  stopAutoOpsMock,
  DATA_STREAMS,
  DATA_STREAMS_RESPONSE,
} from '../fixtures';

test.describe(
  'Data Usage main page',
  {
    tag: [
      '@local-serverless-security_complete',
      '@local-serverless-observability_complete',
      '@local-serverless-search',
    ],
  },
  () => {
    let autoOpsMock: Server;

    test.beforeAll(async ({ esClient }) => {
      // The metrics API checks that the requested data streams exist
      for (const name of DATA_STREAMS) {
        await deleteDataStream(esClient, name);
        await createDataStream(esClient, name);
      }
      autoOpsMock = startAutoOpsMock();
    });

    test.beforeEach(async ({ browserAuth, page }) => {
      // Storage sizes of new data streams are 0 until metering catches up, and those are filtered out
      await page.route('**/internal/api/data_usage/data_streams*', (route) =>
        route.fulfill({ json: DATA_STREAMS_RESPONSE })
      );
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ esClient }) => {
      await stopAutoOpsMock(autoOpsMock);
      for (const name of DATA_STREAMS) {
        await deleteDataStream(esClient, name);
      }
    });

    test('opens from the management card', async ({ pageObjects }) => {
      const { dataUsage } = pageObjects;
      await dataUsage.gotoManagement();
      await dataUsage.managementCard.click();
      await expect(dataUsage.content).toBeVisible();
    });

    test('renders the charts with a legend per data stream', async ({ pageObjects }) => {
      const { dataUsage } = pageObjects;
      await dataUsage.goto();
      await expect(dataUsage.renderedCharts).toHaveCount(2);

      // One series per data stream plus the total
      for (const chart of [dataUsage.ingestRateChart, dataUsage.storageRetainedChart]) {
        await expect(dataUsage.legendItems(chart)).toHaveCount(DATA_STREAMS.length + 1);
      }
    });

    test('links a data stream to Index Management from the legend', async ({
      page,
      pageObjects,
    }) => {
      const { dataUsage } = pageObjects;
      const [dataStream] = DATA_STREAMS;
      await dataUsage.goto();
      await expect(dataUsage.renderedCharts).toHaveCount(2);

      await dataUsage.openLegendActions(dataUsage.ingestRateChart, dataStream);
      await expect(dataUsage.copyDataStreamNameAction).toBeVisible();
      await expect(dataUsage.manageDataStreamAction).toBeVisible();
      await expect(dataUsage.datasetQualityAction).toBeVisible();

      await dataUsage.manageDataStreamAction.click();
      await expect(page).toHaveURL(
        new RegExp(`/app/management/data/index_management/data_streams/${dataStream}`)
      );
    });
  }
);

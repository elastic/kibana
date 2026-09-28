/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { test } from '../fixtures';
import { datasetNames, getInitialTestLogs } from '../../common';

const TO = '2024-01-01T12:00:00.000Z';

test.describe(
  'Dataset quality home',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ logsSynthtraceEsClient }) => {
      await logsSynthtraceEsClient.clean();
    });

    // The empty-state rendering is covered by the `Table` component's Jest test:
    // asserting the absence of data end-to-end would depend on the whole cluster being
    // empty, which a shared Scout stack cannot guarantee.
    test('shows the data sets table once data exists', async ({
      pageObjects,
      logsSynthtraceEsClient,
    }) => {
      await logsSynthtraceEsClient.index(getInitialTestLogs({ to: TO, count: 1 }));

      await pageObjects.datasetQuality.goto();

      await expect(pageObjects.datasetQuality.table).toBeVisible();
      // Asserts the seeded name rather than a row count: EuiBasicTable renders its
      // empty-state message as a real <tr>, so `rowCount > 0` also holds for a table
      // showing "no data sets found".
      await expect
        .poll(async () => pageObjects.datasetQuality.getDatasetNames())
        .toContain(datasetNames[0]);
    });
  }
);

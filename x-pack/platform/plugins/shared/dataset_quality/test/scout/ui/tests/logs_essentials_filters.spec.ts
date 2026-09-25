/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { test } from '../fixtures';
import { getInitialTestLogs } from '../../common';

const TO = '2024-01-01T12:00:00.000Z';

// The logs-essentials tier only surfaces log data, so the data set type filter is not
// rendered there. Every other filter is covered by table_filters.spec.ts.
test.describe(
  'Dataset quality table filters on logs essentials',
  { tag: tags.serverless.observability.logs_essentials },
  () => {
    test.beforeAll(async ({ logsSynthtraceEsClient }) => {
      await logsSynthtraceEsClient.index(getInitialTestLogs({ to: TO, count: 4 }));
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ logsSynthtraceEsClient }) => {
      await logsSynthtraceEsClient.clean();
    });

    test('does not render the data set type filter', async ({ pageObjects }) => {
      await pageObjects.datasetQuality.goto();

      // Anchored on a control that must be present, so a page that failed to render
      // cannot satisfy the negative assertion below.
      await expect(pageObjects.datasetQuality.searchInput).toBeVisible();

      await expect(pageObjects.datasetQuality.getTypesFilter()).toBeHidden();
    });
  }
);

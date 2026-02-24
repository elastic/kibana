/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OBSERVABILITY_STREAMS_ENABLE_QUERY_STREAMS } from '@kbn/management-settings-ids';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../../fixtures';
import { createQueryStream, deleteQueryStream } from '../../fixtures/query_stream_helpers';

const QUERY_STREAM_NAME = 'logs.test';
const ESQL_VIEW_NAME = `$.${QUERY_STREAM_NAME}`;
const TEST_ESQL_QUERY = 'FROM logs | LIMIT 1';

test.describe(
  'Query streams - View query stream',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, kbnClient, pageObjects, esClient }) => {
      await browserAuth.loginAsAdmin();
      await kbnClient.uiSettings.update({
        [OBSERVABILITY_STREAMS_ENABLE_QUERY_STREAMS]: true,
      });
      await createQueryStream(
        esClient,
        kbnClient,
        QUERY_STREAM_NAME,
        ESQL_VIEW_NAME,
        TEST_ESQL_QUERY
      );
      await pageObjects.streams.gotoStreamMainPage();
    });

    test.afterAll(async ({ kbnClient, apiServices, esClient }) => {
      await deleteQueryStream(apiServices, esClient, QUERY_STREAM_NAME, ESQL_VIEW_NAME);
      await kbnClient.uiSettings.update({
        [OBSERVABILITY_STREAMS_ENABLE_QUERY_STREAMS]: false,
      });
    });

    test('should show query stream in navigation with detail view accessible', async ({
      page,
      pageObjects,
    }) => {
      // query stream created and visible in streams ui
      await expect(page.getByTestId(`streamsNameLink-${QUERY_STREAM_NAME}`)).toBeVisible();

      await pageObjects.streams.clickStreamNameLink(QUERY_STREAM_NAME);
      await pageObjects.streams.clickQueryStreamDetailsTab('advanced');

      // details are visible and show the query
      await expect(pageObjects.streams.queryStreamDetailsQueryViewerCodeBlock).toHaveText(
        TEST_ESQL_QUERY
      );
    });
  }
);

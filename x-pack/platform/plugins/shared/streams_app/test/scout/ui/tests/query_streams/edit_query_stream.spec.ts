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

const QUERY_STREAM_NAME = 'logs.host-1';
const ESQL_VIEW_NAME = `$.${QUERY_STREAM_NAME}`;
const INITIAL_ESQL_QUERY = 'FROM logs | WHERE host.name == "host-1"';

test.describe(
  'Query streams - Edit query stream',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, kbnClient, pageObjects, esClient }) => {
      await browserAuth.loginAsAdmin();
      await kbnClient.uiSettings.update({
        [OBSERVABILITY_STREAMS_ENABLE_QUERY_STREAMS]: true,
      });

      // Create the ES|QL view via the Elasticsearch REST API
      await esClient.transport.request({
        method: 'PUT',
        path: `/_query/view/${encodeURIComponent(ESQL_VIEW_NAME)}`,
        body: { query: INITIAL_ESQL_QUERY },
      });

      // Create the query stream definition via the Kibana API so it appears in the streams list
      await kbnClient.request({
        method: 'PUT',
        path: '/api/streams/logs.host-1/_query',
        headers: {
          'kbn-xsrf': 'true',
          'elastic-api-version': '2023-10-31',
        },
        body: { query: { esql: INITIAL_ESQL_QUERY } },
      });

      await pageObjects.streams.gotoStreamMainPage();
    });

    test.afterAll(async ({ kbnClient, apiServices, esClient }) => {
      try {
        await apiServices.streams.deleteStream(QUERY_STREAM_NAME);
      } catch {
        // Stream may not exist or already deleted
      }
      try {
        await esClient.transport.request({
          method: 'DELETE',
          path: `/_query/view/${encodeURIComponent(ESQL_VIEW_NAME)}`,
        });
      } catch {
        // View may already be removed by stream delete or not exist
      }
      await kbnClient.uiSettings.update({
        [OBSERVABILITY_STREAMS_ENABLE_QUERY_STREAMS]: false,
      });
    });

    test("should support editing an existing query stream's ES|QL query from the partitioning tab", async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.streams.clickStreamNameLink('logs');
      await pageObjects.streams.gotoPartitioningTab('logs');
      await pageObjects.streams.selectChildStreamType('Query');
      await expect(page.getByTestId(`queryStream-${QUERY_STREAM_NAME}`)).toBeVisible();

      // TODO - edit the ES|QL query and save
    });
  }
);

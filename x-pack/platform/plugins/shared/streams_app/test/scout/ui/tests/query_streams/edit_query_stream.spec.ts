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

const QUERY_STREAM_NAME = 'logs.test';
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
        path: `/api/streams/${QUERY_STREAM_NAME}/_query`,
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
      pageObjects,
      esClient,
    }) => {
      await pageObjects.streams.clickStreamNameLink('logs');
      await pageObjects.streams.gotoPartitioningTab('logs');
      await pageObjects.streams.selectChildStreamType('Query');
      await pageObjects.streams.clickQueryStreamLink(QUERY_STREAM_NAME);
      await pageObjects.streams.clickQueryStreamDetailsTab('advanced');
      await pageObjects.streams.clickQueryStreamDetailsEditQueryButton();
      const editorValue = await pageObjects.streams.kibanaMonacoEditor.getCodeEditorValue();
      expect(editorValue).toBe(INITIAL_ESQL_QUERY);
      const UPDATED_ESQL_QUERY = 'FROM logs | WHERE host.name == "host-2"';
      await pageObjects.streams.kibanaMonacoEditor.setCodeEditorValue(UPDATED_ESQL_QUERY);
      await pageObjects.streams.clickQueryStreamFlyoutSaveButton();
      await expect(pageObjects.streams.queryStreamUpdatedSuccessToast).toBeVisible();
      await expect(pageObjects.streams.queryStreamDetailsQueryViewerCodeBlock).toHaveText(
        UPDATED_ESQL_QUERY
      );

      // Verify the ES|QL view was updated
      const response = await esClient.transport.request<{
        views: Array<{ name: string; query: string }>;
      }>({
        method: 'GET',
        path: `/_query/view/${encodeURIComponent(ESQL_VIEW_NAME)}`,
      });
      expect(response.views?.length).toBeGreaterThanOrEqual(1);
      expect(response.views![0].name).toBe(ESQL_VIEW_NAME);
      expect(response.views![0].query).toBe(UPDATED_ESQL_QUERY);
    });
  }
);

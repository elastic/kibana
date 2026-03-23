/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../../fixtures';
import {
  createQueryStream,
  createRootStreamViews,
  deleteQueryStream,
  deleteRootStreamViews,
  disableQueryStreams,
  enableQueryStreams,
} from '../../fixtures/query_stream_helpers';

const QUERY_STREAM_NAME = 'logs.ecs.test';
const ESQL_VIEW_NAME = `$.${QUERY_STREAM_NAME}`;
const INITIAL_ESQL_QUERY = 'FROM $.logs.ecs | WHERE host.name == "host-1"';

// Failing: See https://github.com/elastic/kibana/issues/256968
test.describe.skip('Query streams - Edit query stream', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth, kbnClient, pageObjects, esClient }) => {
    await browserAuth.loginAsAdmin();
    await enableQueryStreams(kbnClient);
    await createRootStreamViews(esClient);

    await createQueryStream(
      esClient,
      kbnClient,
      QUERY_STREAM_NAME,
      ESQL_VIEW_NAME,
      INITIAL_ESQL_QUERY
    );

    await pageObjects.streams.gotoStreamMainPage();
  });

  test.afterAll(async ({ kbnClient, apiServices, esClient }) => {
    await deleteQueryStream(apiServices, esClient, QUERY_STREAM_NAME, ESQL_VIEW_NAME);
    await deleteRootStreamViews(esClient);
    await disableQueryStreams(kbnClient);
  });

  test("should support editing an existing query stream's ES|QL query from the partitioning tab", async ({
    pageObjects,
    esClient,
  }) => {
    await pageObjects.streams.clickStreamNameLink('logs.ecs');
    await pageObjects.streams.gotoPartitioningTab('logs.ecs');
    await pageObjects.streams.selectChildStreamType('Query');
    await pageObjects.streams.clickQueryStreamLink(QUERY_STREAM_NAME);
    await pageObjects.streams.clickQueryStreamDetailsTab('advanced');
    await pageObjects.streams.clickQueryStreamDetailsEditQueryButton();
    const editorValue = await pageObjects.streams.kibanaMonacoEditor.getCodeEditorValue();
    expect(editorValue).toBe(INITIAL_ESQL_QUERY);
    const UPDATED_ESQL_QUERY = 'FROM $.logs.ecs | WHERE host.name == "host-2"';
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
});

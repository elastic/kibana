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
  createRootStreamViews,
  deleteQueryStream,
  deleteRootStreamViews,
  disableQueryStreams,
  enableQueryStreams,
} from '../../fixtures/query_stream_helpers';

const ROOT_STREAM_NAMES = ['logs.ecs', 'logs.otel'];
const STREAM_NAMES_CREATED_BY_SPEC = ['logs.ecs.host-1', 'test-query-stream'];

test.describe('Query streams - Create query stream', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth, kbnClient, pageObjects, esClient, apiServices }) => {
    await browserAuth.loginAsAdmin();
    await enableQueryStreams(kbnClient);
    for (const rootStreamName of ROOT_STREAM_NAMES) {
      await apiServices.streams.restoreDataStream(rootStreamName);
    }
    await createRootStreamViews(esClient);
    await pageObjects.streams.gotoStreamMainPage();
  });

  test.afterAll(async ({ kbnClient, apiServices, esClient, log }) => {
    await deleteRootStreamViews(esClient);
    for (const streamName of STREAM_NAMES_CREATED_BY_SPEC) {
      const esqlViewName = `$.${streamName}`;
      await deleteQueryStream(apiServices, esClient, streamName, esqlViewName, log);
    }
    await disableQueryStreams(kbnClient);
  });

  test('should properly handle errors for invalid query streams', async ({ pageObjects }) => {
    await pageObjects.streams.clickCreateQueryStreamButton();
    await pageObjects.streams.fillRoutingRuleName('test-query-stream');
    await pageObjects.streams.kibanaMonacoEditor.waitCodeEditorReady('streamsEsqlEditor');
    await pageObjects.streams.kibanaMonacoEditor.setCodeEditorValue('INVALID QUERY');
    await pageObjects.streams.clickQueryStreamFlyoutSaveButton();
    await expect(pageObjects.streams.queryStreamCreateErrorToast).toBeVisible();
  });

  test('should properly create a root query stream', async ({ pageObjects, esClient }) => {
    const rootQueryStreamName = 'test-query-stream';
    const rootQueryStreamEsqlQuery = 'FROM $.logs.ecs | WHERE host.name == "host-1"';

    // create root query stream
    await pageObjects.streams.createRootQueryStream(rootQueryStreamName, rootQueryStreamEsqlQuery);
    await expect(pageObjects.streams.queryStreamFlyout).toBeHidden();

    // root query stream created in the UI
    await expect(pageObjects.streams.queryStreamCreatedSuccessToast).toBeVisible();

    // ES|QL view was created
    const viewName = `$.${rootQueryStreamName}`;
    const response = await esClient.transport.request<{
      views: Array<{ name: string; query: string }>;
    }>({
      method: 'GET',
      path: `/_query/view/${encodeURIComponent(viewName)}`,
    });
    expect(response.views?.length).toBeGreaterThanOrEqual(1);
    expect(response.views![0].name).toBe(viewName);
    expect(response.views![0].query).toBe(rootQueryStreamEsqlQuery);
  });

  test('should create a query stream as a child of an ingest stream', async ({
    page,
    pageObjects,
    esClient,
  }) => {
    const parentStreamName = 'logs.ecs';
    const childStreamName = 'host-1';
    const esqlQuery = 'FROM $.logs.ecs | WHERE host.name == "host-1"';

    // create child query stream as a child of the parent ingest stream via streams UI
    await pageObjects.streams.clickStreamNameLink(parentStreamName);
    await pageObjects.streams.gotoPartitioningTab(parentStreamName);
    await pageObjects.streams.selectChildStreamType('Query');
    await pageObjects.streams.createChildQueryStreamFromPartitioningTab(childStreamName, esqlQuery);

    // child query stream created appears in the UI
    await expect(pageObjects.streams.childQueryStreamCreatedSuccessToast).toBeVisible();
    await pageObjects.streams.selectChildStreamType('Query');
    await expect(
      page.getByTestId(`queryStream-${parentStreamName}.${childStreamName}`)
    ).toBeVisible();

    // ES|QL view was created for the child query stream
    const viewName = `$.${parentStreamName}.${childStreamName}`;
    const response = await esClient.transport.request<{
      views: Array<{ name: string; query: string }>;
    }>({
      method: 'GET',
      path: `/_query/view/${encodeURIComponent(viewName)}`,
    });
    expect(response.views?.length).toBeGreaterThanOrEqual(1);
    expect(response.views![0].name).toBe(viewName);
    expect(response.views![0].query).toBe(esqlQuery);
  });

  test('rejects invalid child query stream names inline', async ({ page, pageObjects }) => {
    const parentStreamName = 'logs.ecs';

    await pageObjects.streams.clickStreamNameLink(parentStreamName);
    await pageObjects.streams.gotoPartitioningTab(parentStreamName);
    await pageObjects.streams.selectChildStreamType('Query');
    await pageObjects.streams.clickQueryModeCreateQueryStreamButton();

    await pageObjects.streams.fillRoutingRuleName('InvalidName');
    await pageObjects.streams.kibanaMonacoEditor.waitCodeEditorReady('streamsEsqlEditor');
    await pageObjects.streams.kibanaMonacoEditor.setCodeEditorValue('FROM $.logs.ecs');

    const saveButton = page.getByTestId('streamsAppQueryStreamFormSaveButton');
    await expect(saveButton).toBeDisabled();
  });
});

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
  deleteRootStreamViews,
  deleteQueryStream,
  disableQueryStreams,
  enableQueryStreams,
} from '../../fixtures/query_stream_helpers';

const ROOT_STREAM_NAMES = ['logs.ecs', 'logs.otel'];
const QUERY_ROOT_STREAM_NAME = 'parent-query-stream';
const QUERY_CHILD_STREAM_NAME = `child-query-stream`;
const QUERY_GRANDCHILD_STREAM_NAME = `grandchild-query-stream`;
const STREAM_NAMES_CREATED_BY_SPEC = [
  ...ROOT_STREAM_NAMES,
  QUERY_ROOT_STREAM_NAME,
  `${QUERY_ROOT_STREAM_NAME}.${QUERY_CHILD_STREAM_NAME}`,
  `${QUERY_ROOT_STREAM_NAME}.${QUERY_CHILD_STREAM_NAME}.${QUERY_GRANDCHILD_STREAM_NAME}`,
];

test.describe(
  'Query streams - Query stream nested partitioning',
  { tag: tags.stateful.classic },
  () => {
    test.beforeEach(async ({ browserAuth, kbnClient, apiServices, esClient, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await enableQueryStreams(kbnClient);
      for (const rootStreamName of ROOT_STREAM_NAMES) {
        await apiServices.streams.restoreDataStream(rootStreamName);
      }
      await createRootStreamViews(esClient);
      await pageObjects.streams.gotoStreamMainPage();
    });

    test.afterAll(async ({ kbnClient, apiServices, esClient }) => {
      for (const streamName of STREAM_NAMES_CREATED_BY_SPEC) {
        const esqlViewName = `$.${streamName}`;
        await deleteRootStreamViews(esClient);
        await deleteQueryStream(apiServices, esClient, streamName, esqlViewName);
      }
      await disableQueryStreams(kbnClient);
    });

    test('Should create nested query streams from query stream parent', async ({
      page,
      pageObjects,
    }) => {
      // create parent root query stream
      await pageObjects.streams.createRootQueryStream(
        QUERY_ROOT_STREAM_NAME,
        `FROM $.logs.ecs | LIMIT 100`
      );
      await expect(pageObjects.streams.queryStreamFlyout).toBeHidden();

      // navigate back to the streams list view and create a child query stream under the parent
      await pageObjects.streams.gotoStreamMainPage();
      await pageObjects.streams.clickStreamNameLink(QUERY_ROOT_STREAM_NAME);
      await pageObjects.streams.gotoPartitioningTab(QUERY_ROOT_STREAM_NAME);
      await pageObjects.streams.selectChildStreamType('Query');
      await pageObjects.streams.openCreateChildQueryStreamForm();
      const initialChildEsqlQuery =
        await pageObjects.streams.kibanaMonacoEditor.getCodeEditorValue();
      // child should properly reference the parent view in the editor initially
      expect(initialChildEsqlQuery).toBe(`FROM $.${QUERY_ROOT_STREAM_NAME}`);
      await pageObjects.streams.fillAndSaveChildQueryStream(
        QUERY_CHILD_STREAM_NAME,
        `FROM $.${QUERY_ROOT_STREAM_NAME} | LIMIT 100`
      );
      await expect(pageObjects.streams.queryStreamFlyout).toBeHidden();

      // navigate back to the streams list view and create a grandchild query stream under the child
      await pageObjects.streams.gotoStreamMainPage();
      await pageObjects.streams.clickStreamNameLink(
        `${QUERY_ROOT_STREAM_NAME}.${QUERY_CHILD_STREAM_NAME}`
      );
      await pageObjects.streams.gotoPartitioningTab(
        `${QUERY_ROOT_STREAM_NAME}.${QUERY_CHILD_STREAM_NAME}`
      );
      await pageObjects.streams.selectChildStreamType('Query');
      await pageObjects.streams.openCreateChildQueryStreamForm();
      const initialGrandchildEsqlQuery =
        await pageObjects.streams.kibanaMonacoEditor.getCodeEditorValue();
      // grandchild should properly reference the child view in the editor initially
      expect(initialGrandchildEsqlQuery).toBe(
        `FROM $.${QUERY_ROOT_STREAM_NAME}.${QUERY_CHILD_STREAM_NAME}`
      );
      await pageObjects.streams.fillAndSaveChildQueryStream(
        QUERY_GRANDCHILD_STREAM_NAME,
        `FROM $.${QUERY_ROOT_STREAM_NAME}.${QUERY_CHILD_STREAM_NAME} | LIMIT 100`
      );
      await expect(pageObjects.streams.queryStreamFlyout).toBeHidden();

      // navigate back to the streams list view and verify the nested query streams were created in the UI
      await pageObjects.streams.gotoStreamMainPage();
      await pageObjects.streams.clickStreamNameLink(
        `${QUERY_ROOT_STREAM_NAME}.${QUERY_CHILD_STREAM_NAME}.${QUERY_GRANDCHILD_STREAM_NAME}`
      );
      await pageObjects.streams.gotoPartitioningTab(
        `${QUERY_ROOT_STREAM_NAME}.${QUERY_CHILD_STREAM_NAME}.${QUERY_GRANDCHILD_STREAM_NAME}`
      );
      // breadcrumbs should show the proper nesting structure we just created
      await page.getByTestId('streamsAppCurrentStreamPanel').waitFor({ state: 'visible' });
      const breadcrumbs = await page
        .getByTestId('streamsAppCurrentStreamPanel')
        .locator('[data-test-subj^="streamsAppBreadcrumbEntry-"]')
        .allInnerTexts();
      expect(breadcrumbs).toStrictEqual([
        QUERY_ROOT_STREAM_NAME,
        `${QUERY_ROOT_STREAM_NAME}.${QUERY_CHILD_STREAM_NAME}`,
        `${QUERY_ROOT_STREAM_NAME}.${QUERY_CHILD_STREAM_NAME}.${QUERY_GRANDCHILD_STREAM_NAME}`,
      ]);
    });

    test.fixme('Should create nested query streams from ingest stream parent', async () => {});
    test.fixme(
      'Should properly remove deleted child query streams from streams list view',
      async () => {}
    );
    test.fixme(
      'Should error when child query stream references wrong parent in ES|QL query',
      async () => {}
    );
  }
);

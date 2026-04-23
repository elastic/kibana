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

const INGEST_PARENT_STREAM_NAME = 'logs.ecs';
const INGEST_CHILD_STREAM_NAME = 'qs-ingest-child';
const INGEST_GRANDCHILD_STREAM_NAME = 'qs-ingest-grandchild';

const DELETE_TEST_PARENT_STREAM_NAME = 'delete-test-parent-stream';
const DELETE_TEST_CHILD_STREAM_NAME = 'delete-test-child-stream';
const DELETE_TEST_GRANDCHILD_STREAM_NAME = 'delete-test-grandchild-stream';

const ERROR_TEST_PARENT_STREAM_NAME = 'error-test-parent-stream';
const ERROR_TEST_CHILD_STREAM_NAME = 'error-test-child-stream';

const STREAM_NAMES_CREATED_BY_SPEC = [
  ...ROOT_STREAM_NAMES,
  QUERY_ROOT_STREAM_NAME,
  `${QUERY_ROOT_STREAM_NAME}.${QUERY_CHILD_STREAM_NAME}`,
  `${QUERY_ROOT_STREAM_NAME}.${QUERY_CHILD_STREAM_NAME}.${QUERY_GRANDCHILD_STREAM_NAME}`,
  `${INGEST_PARENT_STREAM_NAME}.${INGEST_CHILD_STREAM_NAME}`,
  `${INGEST_PARENT_STREAM_NAME}.${INGEST_CHILD_STREAM_NAME}.${INGEST_GRANDCHILD_STREAM_NAME}`,
  DELETE_TEST_PARENT_STREAM_NAME,
  `${DELETE_TEST_PARENT_STREAM_NAME}.${DELETE_TEST_CHILD_STREAM_NAME}`,
  `${DELETE_TEST_PARENT_STREAM_NAME}.${DELETE_TEST_CHILD_STREAM_NAME}.${DELETE_TEST_GRANDCHILD_STREAM_NAME}`,
  ERROR_TEST_PARENT_STREAM_NAME,
  `${ERROR_TEST_PARENT_STREAM_NAME}.${ERROR_TEST_CHILD_STREAM_NAME}`,
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

    test.afterAll(async ({ kbnClient, esClient, apiServices }) => {
      await Promise.all(
        STREAM_NAMES_CREATED_BY_SPEC.map((streamName) =>
          deleteQueryStream(apiServices, esClient, streamName, `$.${streamName}`)
        )
      );
      await deleteRootStreamViews(esClient);
      await disableQueryStreams(kbnClient);
    });

    test('Should create nested query streams from query stream parent', async ({
      page,
      pageObjects,
    }) => {
      const childFullName = `${QUERY_ROOT_STREAM_NAME}.${QUERY_CHILD_STREAM_NAME}`;
      const grandchildFullName = `${childFullName}.${QUERY_GRANDCHILD_STREAM_NAME}`;

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
      expect(initialChildEsqlQuery).toBe(`FROM $.${QUERY_ROOT_STREAM_NAME}`);
      await pageObjects.streams.fillAndSaveChildQueryStream(
        QUERY_CHILD_STREAM_NAME,
        `FROM $.${QUERY_ROOT_STREAM_NAME} | LIMIT 100`
      );
      await expect(pageObjects.streams.queryStreamFlyout).toBeHidden();

      // navigate to the child's partitioning tab and create a grandchild query stream
      await pageObjects.streams.gotoStreamMainPage();
      await pageObjects.streams.clickStreamNameLink(childFullName);
      await pageObjects.streams.gotoPartitioningTab(childFullName);
      await pageObjects.streams.selectChildStreamType('Query');
      await pageObjects.streams.openCreateChildQueryStreamForm();
      const initialGrandchildEsqlQuery =
        await pageObjects.streams.kibanaMonacoEditor.getCodeEditorValue();
      expect(initialGrandchildEsqlQuery).toBe(`FROM $.${childFullName}`);
      await pageObjects.streams.fillAndSaveChildQueryStream(
        QUERY_GRANDCHILD_STREAM_NAME,
        `FROM $.${childFullName} | LIMIT 100`
      );
      await expect(pageObjects.streams.queryStreamFlyout).toBeHidden();

      // verify the breadcrumb hierarchy on the grandchild's partitioning tab
      await pageObjects.streams.gotoStreamMainPage();
      await pageObjects.streams.clickStreamNameLink(grandchildFullName);
      await pageObjects.streams.gotoPartitioningTab(grandchildFullName);
      await page.getByTestId('streamsAppCurrentStreamPanel').waitFor({ state: 'visible' });
      const breadcrumbs = await page
        .getByTestId('streamsAppCurrentStreamPanel')
        .locator('[data-test-subj^="streamsAppBreadcrumbEntry-"]')
        .allInnerTexts();
      expect(breadcrumbs).toStrictEqual([
        QUERY_ROOT_STREAM_NAME,
        childFullName,
        grandchildFullName,
      ]);
    });

    test('Should create nested query streams from ingest stream parent', async ({
      page,
      pageObjects,
    }) => {
      // navigate to the ingest parent stream's partitioning tab and create a child query stream
      await pageObjects.streams.clickStreamNameLink(INGEST_PARENT_STREAM_NAME);
      await pageObjects.streams.gotoPartitioningTab(INGEST_PARENT_STREAM_NAME);
      await pageObjects.streams.selectChildStreamType('Query');
      await pageObjects.streams.openCreateChildQueryStreamForm();
      const initialChildEsqlQuery =
        await pageObjects.streams.kibanaMonacoEditor.getCodeEditorValue();
      expect(initialChildEsqlQuery).toBe(`FROM $.${INGEST_PARENT_STREAM_NAME}`);
      await pageObjects.streams.fillAndSaveChildQueryStream(
        INGEST_CHILD_STREAM_NAME,
        `FROM $.${INGEST_PARENT_STREAM_NAME} | LIMIT 100`
      );
      await expect(pageObjects.streams.queryStreamFlyout).toBeHidden();

      // navigate to the child query stream's partitioning tab and create a grandchild
      const childFullName = `${INGEST_PARENT_STREAM_NAME}.${INGEST_CHILD_STREAM_NAME}`;
      await pageObjects.streams.gotoStreamMainPage();
      await pageObjects.streams.clickStreamNameLink(childFullName);
      await pageObjects.streams.gotoPartitioningTab(childFullName);
      await pageObjects.streams.selectChildStreamType('Query');
      await pageObjects.streams.openCreateChildQueryStreamForm();
      const initialGrandchildEsqlQuery =
        await pageObjects.streams.kibanaMonacoEditor.getCodeEditorValue();
      expect(initialGrandchildEsqlQuery).toBe(`FROM $.${childFullName}`);
      await pageObjects.streams.fillAndSaveChildQueryStream(
        INGEST_GRANDCHILD_STREAM_NAME,
        `FROM $.${childFullName} | LIMIT 100`
      );
      await expect(pageObjects.streams.queryStreamFlyout).toBeHidden();

      // verify the breadcrumb hierarchy on the grandchild's partitioning tab
      const grandchildFullName = `${childFullName}.${INGEST_GRANDCHILD_STREAM_NAME}`;
      await pageObjects.streams.gotoStreamMainPage();
      await pageObjects.streams.clickStreamNameLink(grandchildFullName);
      await pageObjects.streams.gotoPartitioningTab(grandchildFullName);
      await page.getByTestId('streamsAppCurrentStreamPanel').waitFor({ state: 'visible' });
      const breadcrumbs = await page
        .getByTestId('streamsAppCurrentStreamPanel')
        .locator('[data-test-subj^="streamsAppBreadcrumbEntry-"]')
        .allInnerTexts();
      expect(breadcrumbs).toStrictEqual([
        INGEST_PARENT_STREAM_NAME,
        childFullName,
        grandchildFullName,
      ]);
    });

    test('Should properly remove deleted child query streams from streams list view, including any nested children', async ({
      page,
      pageObjects,
    }) => {
      const childFullName = `${DELETE_TEST_PARENT_STREAM_NAME}.${DELETE_TEST_CHILD_STREAM_NAME}`;
      const grandchildFullName = `${childFullName}.${DELETE_TEST_GRANDCHILD_STREAM_NAME}`;

      // create parent root query stream
      await pageObjects.streams.createRootQueryStream(
        DELETE_TEST_PARENT_STREAM_NAME,
        `FROM $.logs.ecs | LIMIT 100`
      );
      await expect(pageObjects.streams.queryStreamFlyout).toBeHidden();

      // navigate back to the streams list view and create a child query stream under the parent
      await pageObjects.streams.gotoStreamMainPage();
      await pageObjects.streams.clickStreamNameLink(DELETE_TEST_PARENT_STREAM_NAME);
      await pageObjects.streams.gotoPartitioningTab(DELETE_TEST_PARENT_STREAM_NAME);
      await pageObjects.streams.selectChildStreamType('Query');
      await pageObjects.streams.openCreateChildQueryStreamForm();
      await pageObjects.streams.fillAndSaveChildQueryStream(
        DELETE_TEST_CHILD_STREAM_NAME,
        `FROM $.${DELETE_TEST_PARENT_STREAM_NAME} | LIMIT 100`
      );
      await expect(pageObjects.streams.queryStreamFlyout).toBeHidden();

      // navigate to the child's partitioning tab and create a grandchild query stream
      await pageObjects.streams.gotoStreamMainPage();
      await pageObjects.streams.clickStreamNameLink(childFullName);
      await pageObjects.streams.gotoPartitioningTab(childFullName);
      await pageObjects.streams.selectChildStreamType('Query');
      await pageObjects.streams.openCreateChildQueryStreamForm();

      await pageObjects.streams.fillAndSaveChildQueryStream(
        DELETE_TEST_GRANDCHILD_STREAM_NAME,
        `FROM $.${childFullName} | LIMIT 100`
      );
      await expect(pageObjects.streams.queryStreamFlyout).toBeHidden();

      // delete the child query stream
      await pageObjects.streams.gotoStreamMainPage();
      await pageObjects.streams.deleteQueryStreamFromAdvancedTab(childFullName);
      await expect(pageObjects.streams.queryStreamDeletedSuccessToast).toBeVisible();

      // verify the child and grandchild query stream was deleted from the streams list view
      await pageObjects.streams.gotoStreamMainPage();
      await expect(
        page.getByTestId(`streamsNameLink-${DELETE_TEST_PARENT_STREAM_NAME}`)
      ).toBeVisible();
      await expect(page.getByTestId(`streamsNameLink-${childFullName}`)).toBeHidden();
      await expect(page.getByTestId(`streamsNameLink-${grandchildFullName}`)).toBeHidden();
    });

    test('Should error when child query stream references wrong parent in ES|QL query', async ({
      page,
      pageObjects,
    }) => {
      // create parent root query stream
      await pageObjects.streams.createRootQueryStream(
        ERROR_TEST_PARENT_STREAM_NAME,
        `FROM $.logs.ecs | LIMIT 100`
      );
      await expect(pageObjects.streams.queryStreamFlyout).toBeHidden();

      // navigate back to the streams list view and create a child query stream under the parent
      await pageObjects.streams.gotoStreamMainPage();
      await pageObjects.streams.clickStreamNameLink(ERROR_TEST_PARENT_STREAM_NAME);
      await pageObjects.streams.gotoPartitioningTab(ERROR_TEST_PARENT_STREAM_NAME);
      await pageObjects.streams.selectChildStreamType('Query');
      await pageObjects.streams.openCreateChildQueryStreamForm();
      await pageObjects.streams.fillAndSaveChildQueryStream(
        ERROR_TEST_CHILD_STREAM_NAME,
        'FROM $.wrong-parent | LIMIT 100'
      );

      // verify wrong parent error is displayed
      await expect(page.getByText(/must reference its parent stream/)).toBeVisible();
    });
  }
);

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
const INGEST_PARENT_STREAM_NAME = 'logs.ecs';
const CHILD_STREAM_NAME = 'qs-ingest-child';
const GRANDCHILD_STREAM_NAME = 'qs-ingest-grandchild';

const CHILD_FULL_NAME = `${INGEST_PARENT_STREAM_NAME}.${CHILD_STREAM_NAME}`;
const GRANDCHILD_FULL_NAME = `${CHILD_FULL_NAME}.${GRANDCHILD_STREAM_NAME}`;

const STREAM_NAMES_CREATED_BY_SPEC = [GRANDCHILD_FULL_NAME, CHILD_FULL_NAME];

test.describe(
  'Query streams - Nested partitioning from ingest stream parent',
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

    test.afterAll(async ({ kbnClient, esClient, apiServices, log }) => {
      for (const streamName of STREAM_NAMES_CREATED_BY_SPEC) {
        await deleteQueryStream(apiServices, esClient, streamName, `$.${streamName}`, log);
      }
      await deleteRootStreamViews(esClient);
      await disableQueryStreams(kbnClient);
    });

    test('Should create nested query streams from ingest stream parent', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.streams.clickStreamNameLink(INGEST_PARENT_STREAM_NAME);
      await pageObjects.streams.gotoPartitioningTab(INGEST_PARENT_STREAM_NAME);
      await pageObjects.streams.selectChildStreamType('Query');
      await pageObjects.streams.openCreateChildQueryStreamForm();
      const initialChildEsqlQuery =
        await pageObjects.streams.kibanaMonacoEditor.getCodeEditorValue();
      expect(initialChildEsqlQuery).toBe(`FROM $.${INGEST_PARENT_STREAM_NAME}`);
      await pageObjects.streams.fillChildQueryStreamForm(
        CHILD_STREAM_NAME,
        `FROM $.${INGEST_PARENT_STREAM_NAME} | LIMIT 100`
      );
      await pageObjects.streams.saveChildQueryStream();

      await pageObjects.streams.gotoStreamMainPage();
      await pageObjects.streams.clickStreamNameLink(CHILD_FULL_NAME);
      await pageObjects.streams.gotoPartitioningTab(CHILD_FULL_NAME);
      await pageObjects.streams.selectChildStreamType('Query');
      await pageObjects.streams.openCreateChildQueryStreamForm();
      const initialGrandchildEsqlQuery =
        await pageObjects.streams.kibanaMonacoEditor.getCodeEditorValue();
      expect(initialGrandchildEsqlQuery).toBe(`FROM $.${CHILD_FULL_NAME}`);
      await pageObjects.streams.fillChildQueryStreamForm(
        GRANDCHILD_STREAM_NAME,
        `FROM $.${CHILD_FULL_NAME} | LIMIT 100`
      );
      await pageObjects.streams.saveChildQueryStream();

      await pageObjects.streams.gotoStreamMainPage();
      await pageObjects.streams.clickStreamNameLink(GRANDCHILD_FULL_NAME);
      await pageObjects.streams.gotoPartitioningTab(GRANDCHILD_FULL_NAME);
      await page.getByTestId('streamsAppCurrentStreamPanel').waitFor({ state: 'visible' });
      const breadcrumbs = await page
        .getByTestId('streamsAppCurrentStreamPanel')
        .locator('[data-test-subj^="streamsAppBreadcrumbEntry-"]')
        .allInnerTexts();
      expect(breadcrumbs).toStrictEqual([
        INGEST_PARENT_STREAM_NAME,
        CHILD_FULL_NAME,
        GRANDCHILD_FULL_NAME,
      ]);
    });
  }
);

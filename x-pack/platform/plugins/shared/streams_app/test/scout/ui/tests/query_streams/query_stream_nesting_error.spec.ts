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
const PARENT_STREAM_NAME = 'nesting-err-parent';
const CHILD_STREAM_NAME = 'child';

const CHILD_FULL_NAME = `${PARENT_STREAM_NAME}.${CHILD_STREAM_NAME}`;

const STREAM_NAMES_CREATED_BY_SPEC = [CHILD_FULL_NAME, PARENT_STREAM_NAME];

test.describe(
  'Query streams - Error when child references wrong parent',
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

    test('Should error when child query stream references wrong parent in ES|QL query', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.streams.createRootQueryStream(
        PARENT_STREAM_NAME,
        `FROM $.logs.ecs | LIMIT 100`
      );
      await expect(pageObjects.streams.queryStreamFlyout).toBeHidden();

      await pageObjects.streams.gotoStreamMainPage();
      await pageObjects.streams.clickStreamNameLink(PARENT_STREAM_NAME);
      await pageObjects.streams.gotoPartitioningTab(PARENT_STREAM_NAME);
      await pageObjects.streams.selectChildStreamType('Query');
      await pageObjects.streams.openCreateChildQueryStreamForm();
      await pageObjects.streams.fillAndSaveChildQueryStream(
        CHILD_STREAM_NAME,
        'FROM $.wrong-parent | LIMIT 100'
      );

      await expect(page.getByText(/must reference its parent stream/)).toBeVisible();
    });
  }
);

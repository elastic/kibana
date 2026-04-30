/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { getEsqlViewName } from '@kbn/streams-schema/src/models/query/view_name';
import { test } from '../../fixtures';
import { generateLogsData } from '../../fixtures/generators';
import {
  createQueryStream,
  deleteQueryStream,
  disableQueryStreams,
  enableQueryStreams,
} from '../../fixtures/query_stream_helpers';

const CLASSIC_STREAM_NAME = 'logs-classic-qe-test';
const QUERY_STREAM_NAME = `${CLASSIC_STREAM_NAME}.inline-edit-test`;
const ESQL_VIEW_NAME = getEsqlViewName(QUERY_STREAM_NAME);
const INITIAL_ESQL_QUERY = `FROM ${CLASSIC_STREAM_NAME} | WHERE service.name == "test-service"`;

test.describe(
  'Query streams - Inline edit and delete on classic stream partitioning view',
  { tag: tags.stateful.classic },
  () => {
    test.beforeAll(async ({ logsSynthtraceEsClient }) => {
      await logsSynthtraceEsClient.clean();
      await generateLogsData(logsSynthtraceEsClient)({
        index: CLASSIC_STREAM_NAME,
        startTime: 'now-15m',
        endTime: 'now',
        defaults: { 'stream.name': CLASSIC_STREAM_NAME },
      });
    });

    test.beforeEach(async ({ browserAuth, kbnClient, esClient, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await enableQueryStreams(kbnClient);
      await createQueryStream(
        esClient,
        kbnClient,
        QUERY_STREAM_NAME,
        ESQL_VIEW_NAME,
        INITIAL_ESQL_QUERY
      );
      await pageObjects.streams.gotoStreamMainPage();
    });

    test.afterAll(async ({ apiServices, esClient, kbnClient, logsSynthtraceEsClient, log }) => {
      try {
        await deleteQueryStream(apiServices, esClient, QUERY_STREAM_NAME, ESQL_VIEW_NAME, log);
        await apiServices.streams.deleteStream(CLASSIC_STREAM_NAME);
      } catch {
        // Streams may not exist
      } finally {
        await logsSynthtraceEsClient.clean();
        await disableQueryStreams(kbnClient);
      }
    });

    test('should edit a query stream inline from the classic stream partitioning view', async ({
      page,
      pageObjects,
      esClient,
    }) => {
      await test.step('navigate to classic stream partitioning tab', async () => {
        await pageObjects.streams.gotoPartitioningTab(CLASSIC_STREAM_NAME);
        await expect(page.getByTestId(`queryStream-${QUERY_STREAM_NAME}`)).toBeVisible();
      });

      await test.step('enter inline edit mode and verify current query', async () => {
        await pageObjects.streams.clickQueryStreamEditButton(QUERY_STREAM_NAME);
        await pageObjects.streams.kibanaMonacoEditor.waitCodeEditorReady('streamsEsqlEditor');
        const editorValue = await pageObjects.streams.kibanaMonacoEditor.getCodeEditorValue();
        expect(editorValue).toBe(INITIAL_ESQL_QUERY);
      });

      const UPDATED_ESQL_QUERY = `FROM ${CLASSIC_STREAM_NAME} | WHERE service.name == "updated-service"`;

      await test.step('update the query and save', async () => {
        await pageObjects.streams.kibanaMonacoEditor.setCodeEditorValue(UPDATED_ESQL_QUERY);
        await pageObjects.streams.clickQueryStreamFormSaveButton();
        await expect(pageObjects.streams.queryStreamUpdatedSuccessToast).toBeVisible();
      });

      await test.step('verify the ES|QL view was updated', async () => {
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

    test('should delete a query stream from the inline edit form on classic stream', async ({
      page,
      pageObjects,
    }) => {
      await test.step('navigate to classic stream partitioning tab', async () => {
        await pageObjects.streams.gotoPartitioningTab(CLASSIC_STREAM_NAME);
        await expect(page.getByTestId(`queryStream-${QUERY_STREAM_NAME}`)).toBeVisible();
      });

      await test.step('enter inline edit mode and click Remove', async () => {
        await pageObjects.streams.clickQueryStreamEditButton(QUERY_STREAM_NAME);
        await pageObjects.streams.clickQueryStreamFormDeleteButton();
      });

      await test.step('confirm deletion in the modal', async () => {
        await pageObjects.streams.fillDeleteQueryStreamModalInput(QUERY_STREAM_NAME);
        await pageObjects.streams.clickDeleteQueryStreamModalDeleteButton();
        await expect(pageObjects.streams.queryStreamDeletedSuccessToast).toBeVisible();
      });

      await test.step('verify the stream is no longer listed', async () => {
        await expect(page.getByTestId(`queryStream-${QUERY_STREAM_NAME}`)).toBeHidden();
      });
    });
  }
);

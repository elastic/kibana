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

test.describe(
  'Query streams - Create query stream',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, kbnClient, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await kbnClient.uiSettings.update({
        [OBSERVABILITY_STREAMS_ENABLE_QUERY_STREAMS]: true,
      });
      await pageObjects.streams.gotoStreamMainPage();
    });

    test.afterAll(async ({ kbnClient }) => {
      await kbnClient.uiSettings.update({
        [OBSERVABILITY_STREAMS_ENABLE_QUERY_STREAMS]: false,
      });
    });

    test('should properly create a root query stream', async ({ pageObjects }) => {
      const rootQueryStreamName = 'test-query-stream';
      const rootQueryStreamEsqlQuery = 'FROM logs | WHERE host.name == "host-1"';

      await pageObjects.streams.clickCreateQueryStreamButton();
      await expect(pageObjects.streams.queryStreamFlyout).toBeVisible();
      await pageObjects.streams.fillRoutingRuleName(rootQueryStreamName);
      await pageObjects.streams.kibanaMonacoEditor.setCodeEditorValue(rootQueryStreamEsqlQuery);
      await pageObjects.streams.clickQueryStreamFlyoutSaveButton();
      await expect(pageObjects.streams.queryStreamFlyout).toBeHidden();
      await expect(pageObjects.streams.queryStreamCreatedSuccessToast).toBeVisible();
    });
  }
);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../../fixtures';
import { disableQueryStreams, enableQueryStreams } from '../../fixtures/query_stream_helpers';

test.describe('Query streams - feature flag gating', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.streams.gotoStreamMainPage();
  });

  test.afterAll(async ({ kbnClient }) => {
    await disableQueryStreams(kbnClient);
  });

  test('should properly hide query streams UI when feature flag is off', async ({
    page,
    pageObjects,
    kbnClient,
  }) => {
    await disableQueryStreams(kbnClient);
    await page.reload();
    await expect(pageObjects.streams.createQueryStreamButton).toBeHidden();

    await pageObjects.streams.gotoPartitioningTab('logs.ecs');
    await expect(pageObjects.streams.childStreamTypeSelector).toBeHidden();
  });

  test('should properly show query streams UI when feature flag is on', async ({
    page,
    pageObjects,
    kbnClient,
  }) => {
    await enableQueryStreams(kbnClient);
    await page.reload();
    await expect(pageObjects.streams.createQueryStreamButton).toBeVisible();

    await pageObjects.streams.gotoPartitioningTab('logs.ecs');
    await expect(pageObjects.streams.childStreamTypeSelector).toBeVisible();
  });
});

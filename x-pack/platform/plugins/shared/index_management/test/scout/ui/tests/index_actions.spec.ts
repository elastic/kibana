/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

const testIndexName = `index-actions-test-${Math.random()}`;

const getPrimaryStats = async (esClient: EsClient) => {
  const { _all } = await esClient.indices.stats({ index: testIndexName });
  return _all.primaries;
};

const indexDocument = (esClient: EsClient, refresh = false) =>
  esClient.index({ index: testIndexName, document: { message: 'test' }, refresh });

// Serverless doesn't offer these index actions.
test.describe('Index actions', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ esClient, browserAuth, pageObjects }) => {
    await esClient.indices.delete({ index: testIndexName }, { ignore: [404] });
    await esClient.indices.create({
      index: testIndexName,
      // Only explicit refreshes and flushes, so each action's effect is observable.
      settings: { number_of_replicas: 0, refresh_interval: -1 },
    });
    await browserAuth.loginAsIndexManagementUser();
    await pageObjects.indexManagement.navigateToIndexManagementTab('indices');
  });

  test.afterEach(async ({ esClient }) => {
    await esClient.indices.delete({ index: testIndexName }, { ignore: [404] });
  });

  test('closes and reopens an index', async ({ esClient, pageObjects }) => {
    const getIndexState = async () => {
      const { metadata } = await esClient.cluster.state({
        metric: 'metadata',
        index: testIndexName,
      });
      return metadata?.indices?.[testIndexName]?.state;
    };

    await pageObjects.indexManagement.runIndexActionFromContextMenu(
      testIndexName,
      'closeIndexMenuButton'
    );
    await pageObjects.toasts.waitForToastWithText('Successfully closed 1 index');
    expect(await getIndexState()).toBe('close');

    await pageObjects.indexManagement.runIndexActionFromContextMenu(
      testIndexName,
      'openIndexMenuButton'
    );
    await pageObjects.toasts.waitForToastWithText('Successfully opened 1 index');
    expect(await getIndexState()).toBe('open');
  });

  test('refreshes an index', async ({ esClient, pageObjects }) => {
    await indexDocument(esClient);
    expect((await esClient.count({ index: testIndexName })).count).toBe(0);

    await pageObjects.indexManagement.runIndexActionFromContextMenu(
      testIndexName,
      'refreshIndexMenuButton'
    );
    await pageObjects.toasts.waitForToastWithText('Successfully refreshed 1 index');

    expect((await esClient.count({ index: testIndexName })).count).toBe(1);
  });

  test('flushes an index', async ({ esClient, pageObjects }) => {
    await indexDocument(esClient);
    expect((await getPrimaryStats(esClient))?.translog?.uncommitted_operations).toBe(1);

    await pageObjects.indexManagement.runIndexActionFromContextMenu(
      testIndexName,
      'flushIndexMenuButton'
    );
    await pageObjects.toasts.waitForToastWithText('Successfully flushed 1 index');

    expect((await getPrimaryStats(esClient))?.translog?.uncommitted_operations).toBe(0);
  });

  // Clearing caches has no effect that can be read back, so the success toast is the outcome.
  test('clears the cache of an index', async ({ page, pageObjects }) => {
    await pageObjects.indexManagement.runIndexActionFromContextMenu(
      testIndexName,
      'clearCacheIndexMenuButton'
    );
    await expect(page.testSubj.locator('globalToastList')).toContainText(
      'Successfully cleared cache for 1 index'
    );
  });

  test('force merges an index into the requested number of segments', async ({
    esClient,
    pageObjects,
  }) => {
    await indexDocument(esClient, true);
    await indexDocument(esClient, true);
    expect((await getPrimaryStats(esClient))?.segments?.count).toBe(2);

    await pageObjects.indexManagement.forcemergeIndexFromContextMenu(testIndexName, 1);
    await pageObjects.toasts.waitForToastWithText('Successfully force merged 1 index');

    expect((await getPrimaryStats(esClient))?.segments?.count).toBe(1);
  });
});

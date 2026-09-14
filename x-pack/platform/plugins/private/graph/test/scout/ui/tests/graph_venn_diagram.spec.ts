/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test, testData } from '../fixtures';

test.describe('Graph - Venn diagram on edge click', { tag: testData.GRAPH_UI_TAGS }, () => {
  let dataViewId: string | undefined;

  test.beforeAll(async ({ esArchiver, apiServices }) => {
    await esArchiver.loadIfNeeded(testData.SECREPO_ES_ARCHIVE);
    const { data } = await apiServices.dataViews.create({
      title: testData.SECREPO_INDEX,
      name: testData.SECREPO_INDEX,
      timeFieldName: testData.SECREPO_TIME_FIELD,
    });
    dataViewId = data.id;
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginWithCustomRole(testData.GRAPH_ALL_ROLE);
  });

  test.afterAll(async ({ apiServices }) => {
    if (dataViewId) {
      await apiServices.dataViews.delete(dataViewId);
    }
  });

  test('displays link summary for the clicked edge', async ({ pageObjects: { graph } }) => {
    await test.step('build a small graph', async () => {
      await graph.goto();
      await graph.waitForListing();
      await graph.clickCreateGraph();
      await graph.waitForWorkspace();
      await graph.pickIndexPattern(testData.SECREPO_INDEX);
      await graph.addFields(testData.SECREPO_DEFAULT_FIELDS);
      await graph.runQuery('admin');
      await expect.poll(() => graph.nodeCount(), { timeout: 15000 }).toBeGreaterThan(2);
    });

    await test.step('isolate the test ↔ /test/wp-admin/ edge', async () => {
      await graph.isolateEdge('test', '/test/wp-admin/');
      await expect.poll(() => graph.selectionCount(), { timeout: 10000 }).toBeLessThanOrEqual(2);
    });

    await test.step('click the edge to reveal the Venn link summary', async () => {
      await graph.stopLayout();
      await graph.clickIsolatedEdge();
      await graph.startLayout();
      await expect(graph.vennLargeTerm1).toBeVisible();
    });

    await test.step('assert the link summary terms', async () => {
      await expect(graph.vennLargeTerm1).toHaveText('/test/wp-admin/');
      await expect(graph.vennLargeTerm2).toHaveText('test');
      await expect(graph.vennSmallTerm1).toHaveText('4');
      await expect(graph.vennSmallOverlap).toHaveText(/\(4\)/);
      await expect(graph.vennSmallTerm2).toHaveText('4');
    });
  });
});

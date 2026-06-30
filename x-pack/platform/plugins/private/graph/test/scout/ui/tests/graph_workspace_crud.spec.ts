/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test, testData } from '../fixtures';

test.describe('Graph - workspace CRUD', { tag: testData.GRAPH_UI_TAGS }, () => {
  let dataViewId: string | undefined;
  const workspaceName = `graph workspace ${Date.now()}`;

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
    await apiServices.graphWorkspaces.deleteByTitle(workspaceName);
    if (dataViewId) {
      await apiServices.dataViews.delete(dataViewId);
    }
  });

  test('build, save, open, replace, and delete a workspace', async ({ pageObjects: { graph } }) => {
    await test.step('navigate to the empty workspace', async () => {
      await graph.goto();
      await graph.waitForListing();
      await graph.clickCreateGraph();
      await graph.waitForWorkspace();
    });

    await test.step('build a graph by querying admin', async () => {
      await graph.pickIndexPattern(testData.SECREPO_INDEX);
      await graph.addFields(testData.SECREPO_DEFAULT_FIELDS);
      await graph.runQuery('admin');
      await expect.poll(() => graph.nodeCount(), { timeout: 15000 }).toBeGreaterThan(0);
    });

    await test.step('save the workspace', async () => {
      await graph.saveWorkspaceAs(workspaceName);
    });

    await test.step('open the saved workspace from the listing', async () => {
      await graph.goToListingViaBreadcrumb();
      await graph.waitForListing();
      await graph.openWorkspace(workspaceName);
      await graph.waitForWorkspace();
      await expect.poll(() => graph.nodeCount(), { timeout: 15000 }).toBeGreaterThan(0);
    });

    await test.step('create a new empty workspace via the "New" toolbar button', async () => {
      await graph.newWorkspace({ discardChanges: true });
      await graph.pickIndexPattern(testData.SECREPO_INDEX);
      expect(await graph.nodeCount()).toBe(0);
      expect(await graph.edgeCount()).toBe(0);
    });

    await test.step('delete the saved workspace from the listing', async () => {
      await graph.goToListingViaBreadcrumb();
      await graph.waitForListing();
      await graph.deleteWorkspace(workspaceName);
    });
  });
});

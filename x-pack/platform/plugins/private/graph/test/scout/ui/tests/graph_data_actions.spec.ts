/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test, testData } from '../fixtures';

test.describe('Graph - data actions', { tag: testData.GRAPH_UI_TAGS }, () => {
  let dataViewId: string | undefined;
  const dataViewName = `graph-data-actions-${Date.now()}`;

  test.beforeAll(async ({ esArchiver, apiServices }) => {
    await esArchiver.loadIfNeeded(testData.SECREPO_ES_ARCHIVE);
    const { data } = await apiServices.dataViews.create({
      title: testData.SECREPO_INDEX,
      name: dataViewName,
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

  test('expands nodes, fills connections, and exposes requests in Inspector', async ({
    pageObjects: { graph },
  }) => {
    await graph.createWorkspaceWithQuery({
      dataViewTitle: testData.SECREPO_INDEX,
      dataViewName,
      fields: testData.SECREPO_DEFAULT_FIELDS,
      query: 'admin',
    });
    await graph.selectNodes(['admin']);
    await graph.stopLayout();

    await graph.expandSelection();
    await expect.poll(() => graph.nodeCount()).toBeGreaterThan(0);

    await graph.selectAllNodes();
    await graph.fillConnections();
    await expect.poll(() => graph.edgeCount()).toBeGreaterThan(0);

    await graph.openInspector();
    await expect(graph.inspectorRequestTab).toBeVisible();
    await expect(graph.inspectorResponseTab).toBeVisible();
  });
});

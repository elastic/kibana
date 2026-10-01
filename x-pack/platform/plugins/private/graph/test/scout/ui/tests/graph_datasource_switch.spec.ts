/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test, testData } from '../fixtures';

test.describe('Graph - datasource switching', { tag: testData.GRAPH_UI_TAGS }, () => {
  let firstDataViewId: string | undefined;
  let secondDataViewId: string | undefined;
  const firstDataViewName = `graph-datasource-first-${Date.now()}`;
  const secondDataViewName = `graph-datasource-second-${Date.now()}`;

  test.beforeAll(async ({ esArchiver, apiServices }) => {
    await esArchiver.loadIfNeeded(testData.SECREPO_ES_ARCHIVE);
    const firstDataView = await apiServices.dataViews.create({
      title: testData.SECREPO_INDEX,
      name: firstDataViewName,
      timeFieldName: testData.SECREPO_TIME_FIELD,
    });
    const secondDataView = await apiServices.dataViews.create({
      title: testData.SECREPO_INDEX,
      name: secondDataViewName,
      timeFieldName: testData.SECREPO_TIME_FIELD,
    });
    firstDataViewId = firstDataView.data.id;
    secondDataViewId = secondDataView.data.id;
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginWithCustomRole(testData.GRAPH_ALL_ROLE);
  });

  test.afterAll(async ({ apiServices }) => {
    if (firstDataViewId) {
      await apiServices.dataViews.delete(firstDataViewId);
    }
    if (secondDataViewId) {
      await apiServices.dataViews.delete(secondDataViewId);
    }
  });

  test('switches datasource and resets the rendered topology', async ({
    pageObjects: { graph },
  }) => {
    await graph.createWorkspaceWithQuery({
      dataViewTitle: testData.SECREPO_INDEX,
      dataViewName: firstDataViewName,
      fields: ['url'],
      query: 'admin',
    });
    await expect.poll(() => graph.nodeCount()).toBeGreaterThan(0);

    await graph.changeIndexPatternByName(secondDataViewName);
    await expect(graph.datasourceButton).toContainText(secondDataViewName);
    await expect.poll(() => graph.nodeCount()).toBe(0);

    await graph.addFields(['url']);
    await graph.runQuery('admin');
    await expect.poll(() => graph.nodeCount()).toBeGreaterThan(0);
  });
});

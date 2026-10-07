/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, testData } from '../fixtures';

spaceTest.describe('Graph - datasource switching', { tag: testData.GRAPH_UI_TAGS }, () => {
  let firstDataViewId: string | undefined;
  let secondDataViewId: string | undefined;
  const firstDataViewName = `graph-datasource-first-${Date.now()}`;
  const secondDataViewName = `graph-datasource-second-${Date.now()}`;

  spaceTest.beforeAll(async ({ apiServices, scoutSpace }) => {
    const firstDataView = await apiServices.dataViews.create({
      title: testData.SECREPO_INDEX,
      name: firstDataViewName,
      timeFieldName: testData.SECREPO_TIME_FIELD,
      spaceId: scoutSpace.id,
    });
    const secondDataView = await apiServices.dataViews.create({
      title: testData.SECREPO_INDEX,
      name: secondDataViewName,
      timeFieldName: testData.SECREPO_TIME_FIELD,
      spaceId: scoutSpace.id,
    });
    firstDataViewId = firstDataView.data.id;
    secondDataViewId = secondDataView.data.id;
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginWithCustomRole(testData.GRAPH_ALL_ROLE);
  });

  spaceTest.afterAll(async ({ apiServices, scoutSpace }) => {
    if (firstDataViewId) {
      await apiServices.dataViews.delete(firstDataViewId, scoutSpace.id);
    }
    if (secondDataViewId) {
      await apiServices.dataViews.delete(secondDataViewId, scoutSpace.id);
    }
  });

  spaceTest(
    'switches datasource and resets the rendered topology',
    async ({ pageObjects: { graph } }) => {
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
    }
  );
});

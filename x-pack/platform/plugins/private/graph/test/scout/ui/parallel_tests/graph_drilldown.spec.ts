/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, testData } from '../fixtures';

spaceTest.describe('Graph - drilldowns', { tag: testData.GRAPH_UI_TAGS }, () => {
  let dataViewId: string | undefined;
  const dataViewName = `graph-drilldown-${Date.now()}`;

  spaceTest.beforeAll(async ({ apiServices, scoutSpace }) => {
    const { data } = await apiServices.dataViews.create({
      title: testData.SECREPO_INDEX,
      name: dataViewName,
      timeFieldName: testData.SECREPO_TIME_FIELD,
      spaceId: scoutSpace.id,
    });
    dataViewId = data.id;
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginWithCustomRole(testData.GRAPH_ALL_ROLE);
  });

  spaceTest.afterAll(async ({ apiServices, scoutSpace }) => {
    if (dataViewId) {
      await apiServices.dataViews.delete(dataViewId, scoutSpace.id);
    }
  });

  spaceTest(
    'offers the raw documents drilldown for a selected node',
    async ({ pageObjects: { graph } }) => {
      await graph.createWorkspaceWithQuery({
        dataViewTitle: testData.SECREPO_INDEX,
        dataViewName,
        fields: testData.SECREPO_DEFAULT_FIELDS,
        query: 'admin',
      });
      await graph.selectNodes(['admin']);
      await graph.stopLayout();
      await graph.openDrilldowns();

      await expect(graph.rawDocumentsDrilldown).toBeVisible();
      await expect(graph.rawDocumentsDrilldown).toBeEnabled();
    }
  );
});

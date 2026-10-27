/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, testData } from '../fixtures';

spaceTest.describe('Graph - topology editing', { tag: testData.GRAPH_UI_TAGS }, () => {
  let dataViewId: string | undefined;
  const dataViewName = `graph-topology-${Date.now()}`;

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
    'merges nodes and restores the rendered topology with undo and redo',
    async ({ pageObjects: { graph } }) => {
      await graph.createWorkspaceWithQuery({
        dataViewTitle: testData.SECREPO_INDEX,
        dataViewName,
        fields: testData.SECREPO_DEFAULT_FIELDS,
        query: 'admin',
      });
      await graph.isolateEdge('test', '/test/wp-admin/');
      await graph.stopLayout();
      await graph.clickIsolatedEdge();

      await graph.mergeLeftIntoRight();
      await expect(graph.node('/test/wp-admin/')).toHaveCount(0);

      await graph.undo();
      await expect(graph.node('/test/wp-admin/')).toHaveCount(1);
      await expect(graph.node('test')).toHaveCount(1);

      await graph.redo();
      await expect(graph.node('/test/wp-admin/')).toHaveCount(0);
    }
  );

  spaceTest('groups and ungroups selected nodes', async ({ pageObjects: { graph } }) => {
    await graph.createWorkspaceWithQuery({
      dataViewTitle: testData.SECREPO_INDEX,
      dataViewName,
      fields: testData.SECREPO_DEFAULT_FIELDS,
      query: 'admin',
    });
    await graph.selectNodes(['blog', 'admin']);
    await graph.stopLayout();

    await graph.groupSelection();
    await expect(graph.node('admin')).toHaveCount(1);
    await expect(graph.node('blog')).toHaveCount(0);

    await graph.ungroupSelection();
    await expect(graph.node('blog')).toHaveCount(1);
    await expect(graph.node('admin')).toHaveCount(1);
  });
});

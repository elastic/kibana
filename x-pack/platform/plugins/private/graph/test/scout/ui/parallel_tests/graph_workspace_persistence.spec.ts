/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, testData } from '../fixtures';

spaceTest.describe(
  'Graph - workspace presentation persistence',
  { tag: testData.GRAPH_UI_TAGS },
  () => {
    let dataViewId: string | undefined;
    const dataViewName = `graph-persistence-${Date.now()}`;
    const workspaceName = `graph presentation ${Date.now()}`;
    const customLabel = 'custom admin path';
    const customColor = '#16C5C0';

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
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'restores a custom node label and color after save and reopen',
      async ({ pageObjects: { graph } }) => {
        await graph.createWorkspaceWithQuery({
          dataViewTitle: testData.SECREPO_INDEX,
          dataViewName,
          fields: testData.SECREPO_DEFAULT_FIELDS,
          query: 'admin',
        });
        await graph.selectNodes(['/test/wp-admin/']);
        await graph.stopLayout();
        await graph.setNodeLabel(customLabel);
        await graph.selectNodeColor(customColor);

        await graph.saveWorkspaceAs(workspaceName);
        await graph.goToListingViaBreadcrumb();
        await graph.waitForListing();
        await graph.openWorkspace(workspaceName);
        await graph.waitForWorkspace();

        const restoredNode = graph.node(customLabel);
        await expect(restoredNode).toHaveCount(1);
        await expect(restoredNode).toHaveAttribute('data-node-color', customColor);
        await expect(graph.node('/test/wp-admin/')).toHaveCount(0);
      }
    );
  }
);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import rison from '@kbn/rison';
import { expect } from '@kbn/scout/ui';
import { spaceTest, testData } from '../fixtures';

const getDiscoverAppStateQuery = (url: URL): string => {
  const appStateQuery = new URLSearchParams(url.hash.split('?')[1]).get('_a');
  if (!appStateQuery) {
    throw new Error('Expected the Discover URL to contain _a app state');
  }
  return appStateQuery;
};

spaceTest.describe('Graph - drilldowns', { tag: testData.GRAPH_UI_TAGS }, () => {
  let dataViewId: string | undefined;
  const dataViewName = `graph-drilldown-${Date.now()}`;
  const workspaceName = `graph drilldown encoder ${Date.now()}`;
  const customDrilldownTitle = 'Search selected label';

  spaceTest.beforeAll(async ({ apiServices, scoutSpace }) => {
    const { data } = await apiServices.dataViews.create({
      title: testData.SECREPO_INDEX,
      name: dataViewName,
      timeFieldName: testData.SECREPO_TIME_FIELD,
      spaceId: scoutSpace.id,
    });
    dataViewId = data.id;
  });

  spaceTest.beforeEach(async ({ browserAuth, scoutSpace }) => {
    await browserAuth.loginWithCustomRole(testData.graphAllDiscoverReadRole(scoutSpace.id));
  });

  spaceTest.afterAll(async ({ apiServices, scoutSpace }) => {
    if (dataViewId) {
      await apiServices.dataViews.delete(dataViewId, scoutSpace.id);
    }
    await scoutSpace.savedObjects.cleanStandardList();
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

  spaceTest(
    'persists and executes a custom Discover encoder',
    async ({ pageObjects: { graph }, kbnUrl, scoutSpace }) => {
      await graph.createWorkspaceWithQuery({
        dataViewTitle: testData.SECREPO_INDEX,
        dataViewName,
        fields: testData.SECREPO_DEFAULT_FIELDS,
        query: 'admin',
      });
      await graph.stopLayout();
      const discoverUrl = kbnUrl.app('discover', { space: scoutSpace.id });
      await graph.createDrilldown({
        title: customDrilldownTitle,
        url: `${discoverUrl}#/?_g=(time:(from:'2016-01-01T00:00:00.000Z',to:'2017-01-01T00:00:00.000Z'))&_a=(query:(language:kuery,query:{{gquery}}))`,
        encoder: 'KQL AND query',
      });
      await graph.saveWorkspaceAs(workspaceName);

      await graph.goToListingViaBreadcrumb();
      await graph.waitForListing();
      await graph.openWorkspace(workspaceName);
      await graph.waitForWorkspace();
      await graph.selectNodes(['admin', '/test/wp-admin/']);
      await graph.stopLayout();
      await graph.openDrilldowns();

      const discoverPage = await graph.openDrilldown(customDrilldownTitle);
      const openedUrl = new URL(discoverPage.url());
      expect(openedUrl.pathname).toBe(new URL(discoverUrl).pathname);

      const appState = rison.decode(decodeURIComponent(getDiscoverAppStateQuery(openedUrl)));
      expect(appState).toMatchObject({
        query: {
          language: 'kuery',
          query: expect.stringMatching(/(?=.*admin)(?=.* and )/),
        },
      });

      const discoverQuery = discoverPage.getByTestId('queryInput');
      await expect(discoverQuery).toContainText('admin');
      await expect(discoverQuery).toContainText(' and ');
      await expect(discoverPage.getByTestId('discoverQueryHits')).not.toHaveText('0');
      const discoverTable = discoverPage.getByTestId('discoverDocTable');
      await expect(discoverTable).toContainText('admin');
      await expect(discoverTable).toContainText('/test/wp-admin/');
      await discoverPage.close();
    }
  );
});

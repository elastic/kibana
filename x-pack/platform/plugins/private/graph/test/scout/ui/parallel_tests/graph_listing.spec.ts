/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';

const GRAPH_A = { title: 'Graph Alpha', description: 'First test graph' };
const GRAPH_B = { title: 'Graph Beta', description: 'Second test graph' };

const GRAPH_WORKSPACE_ATTRS = { numLinks: 0, numVertices: 0, wsState: '{}', version: 1 };

spaceTest.describe('Graph listing page', { tag: tags.stateful.classic }, () => {
  spaceTest.beforeAll(async ({ kbnClient, scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
    await kbnClient.savedObjects.create({
      type: 'graph-workspace',
      attributes: { ...GRAPH_A, ...GRAPH_WORKSPACE_ATTRS },
      space: scoutSpace.id,
    });
    await kbnClient.savedObjects.create({
      type: 'graph-workspace',
      attributes: { ...GRAPH_B, ...GRAPH_WORKSPACE_ATTRS },
      space: scoutSpace.id,
    });
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('renders saved graphs in the listing', async ({ pageObjects }) => {
    await pageObjects.graphListing.goto();
    await expect(pageObjects.graphListing.pageHeader).toBeVisible();
    await expect(pageObjects.graphListing.itemLinks).toHaveCount(2);
    await expect(pageObjects.graphListing.itemLinks.filter({ hasText: GRAPH_A.title })).toHaveCount(
      1
    );
    await expect(pageObjects.graphListing.itemLinks.filter({ hasText: GRAPH_B.title })).toHaveCount(
      1
    );
  });

  spaceTest('search filters items by title', async ({ pageObjects }) => {
    await pageObjects.graphListing.goto();
    await pageObjects.graphListing.searchFor(GRAPH_A.title);
    await expect(pageObjects.graphListing.itemLinks).toHaveCount(1);
    await expect(pageObjects.graphListing.itemLinks.filter({ hasText: GRAPH_A.title })).toHaveCount(
      1
    );
  });

  spaceTest('select all and delete removes all graphs', async ({ pageObjects }) => {
    await pageObjects.graphListing.goto();
    await expect(pageObjects.graphListing.itemLinks).toHaveCount(2);
    await pageObjects.graphListing.selectAllAndDelete();
    await expect(pageObjects.graphListing.emptyPromptButton).toBeVisible();
  });

  spaceTest('create button navigates to the workspace editor', async ({ page, pageObjects }) => {
    await pageObjects.graphListing.goto();
    await pageObjects.graphListing.createGraphButton.click();
    await expect(page).toHaveURL(/\/app\/graph#\/workspace$/);
  });
});

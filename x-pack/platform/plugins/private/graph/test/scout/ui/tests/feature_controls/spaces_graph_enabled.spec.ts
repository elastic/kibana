/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test, testData } from '../../fixtures';

test.describe(
  'Graph feature controls - graph enabled in custom space (UI smoke)',
  { tag: testData.GRAPH_UI_TAGS },
  () => {
    let spaceId: string;

    test.beforeAll(async ({ apiServices }, workerInfo) => {
      spaceId = `graph-enabled-ui-${workerInfo.parallelIndex}-${Date.now()}`;
      await apiServices.spaces.create({ id: spaceId, name: spaceId, disabledFeatures: [] });
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ apiServices }) => {
      await apiServices.spaces.delete(spaceId);
    });

    test('admin lands on the graph listing inside the custom space', async ({
      pageObjects: { graph },
    }) => {
      await test.step('navigate to /s/<space>/app/graph', async () => {
        await graph.gotoInSpace(spaceId);
        await graph.waitForListing();
        await expect(graph.createGraphPromptButton).toBeVisible();
      });

      await test.step('open an empty workspace via the Create button', async () => {
        // Don't assume a data view exists in this custom space — assert on
        // the workspace shell (breadcrumb + save button), not the SVG canvas.
        await graph.clickCreateGraph();
        await graph.waitForWorkspace();
        await expect(graph.currentGraphBreadcrumb).toHaveText('Unsaved graph');
        await expect(graph.saveButton).toBeVisible();
      });
    });
  }
);

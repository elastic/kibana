/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test, testData } from '../../fixtures';

test.describe(
  'Graph feature controls - graph:all UI smoke',
  { tag: testData.GRAPH_UI_TAGS },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginWithCustomRole(testData.GRAPH_ALL_ROLE);
    });

    test('lands on the listing and can open an empty workspace', async ({
      pageObjects: { graph },
    }) => {
      await test.step('navigate to the graph listing', async () => {
        await graph.goto();
        await graph.waitForListing();
        await expect(graph.createGraphPromptButton).toBeVisible();
      });

      await test.step('open an empty workspace via the Create button', async () => {
        // The `graph_all_role` has no data-view access, so the SVG canvas is
        // replaced by a "No data source" panel. The workspace shell itself
        // still loads — assert the breadcrumb and save toolbar instead
        await graph.clickCreateGraph();
        await graph.waitForWorkspace();
        await expect(graph.currentGraphBreadcrumb).toHaveText('Unsaved graph');
        await expect(graph.saveButton).toBeVisible();
      });
    });
  }
);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest as test } from '../../fixtures';
import { cleanupWorkflowsAndRules } from '../../fixtures/cleanup';
import { graphNodeId } from '../../fixtures/page_objects/workflow_graph_authoring_page';
import { getMultiStepGraphWorkflowYaml } from '../../fixtures/workflows';

/** Every "+" insertion control on the canvas: mid-wire (`wire`) and dangling-exit (`terminal`). */
const wireControls = (page: ScoutPage) =>
  page.testSubj
    .locator('workflowGraphWireControl-wire')
    .or(page.testSubj.locator('workflowGraphWireControl-terminal'));

/**
 * With `workflows:experimentalFeatures` off (the default) the editor behaves as it does upstream:
 * the YAML editor opens first, the floating bottom bar carries the Run button, and the graph is a
 * read-only view the user can switch to.
 */
test.describe(
  'Workflow editor with the experimental features off',
  { tag: [...tags.stateful.classic] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    test.afterAll(async ({ scoutSpace, apiServices }) => {
      await cleanupWorkflowsAndRules({ scoutSpace, apiServices });
    });

    test('opens on the YAML editor with the floating bottom bar and its Run button', async ({
      page,
      apiServices,
      pageObjects,
    }) => {
      const { created } = await apiServices.workflows.bulkCreate([
        getMultiStepGraphWorkflowYaml('Flag off bottom bar'),
      ]);
      const editor = pageObjects.workflowEditor;

      await editor.gotoWorkflow(created[0].id);

      await expect(editor.yamlEditor).toBeVisible();
      await expect(page.testSubj.locator('workflowDetailBottomBar')).toBeVisible();
      await expect(editor.runButton).toBeVisible();
      await expect(editor.runButton).toBeEnabled();
    });

    test('shows the graph read only: no insertion controls, and no way to remove or reset a node', async ({
      page,
      apiServices,
      pageObjects,
    }) => {
      const { created } = await apiServices.workflows.bulkCreate([
        getMultiStepGraphWorkflowYaml('Flag off read-only graph'),
      ]);
      const editor = pageObjects.workflowEditor;
      await editor.gotoWorkflow(created[0].id);

      await editor.switchToGraphView();

      const node = page.testSubj.locator(`workflowGraphNode-${graphNodeId('step_3')}`);
      await expect(node).toBeVisible();
      await expect(wireControls(page)).toHaveCount(0);

      await node.click();

      await expect(page.testSubj.locator('workflowStepConfigPanel')).toBeVisible();
      await expect(page.testSubj.locator('workflowStepConfigPanelRemoveNode')).toHaveCount(0);
      await expect(page.testSubj.locator('workflowStepConfigPanelResetNode')).toHaveCount(0);
      // The bar stays with the graph, so the workflow can still be run from it.
      await expect(editor.runButton).toBeVisible();
    });
  }
);

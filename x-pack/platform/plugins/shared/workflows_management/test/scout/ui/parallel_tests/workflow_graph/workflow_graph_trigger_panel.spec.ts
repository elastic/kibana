/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest as test } from '../../fixtures';

const EXPERIMENTAL_FEATURES_SETTING = 'workflows:experimentalFeatures';

test.describe(
  'Workflow graph trigger panel — edits apply as they are made',
  {
    tag: [
      ...tags.stateful.classic,
      ...tags.serverless.observability.complete,
      ...tags.serverless.security.complete,
    ],
  },
  () => {
    test.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.set({
        [EXPERIMENTAL_FEATURES_SETTING]: true,
      });
    });

    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.workflowEditor.gotoNewWorkflow();
      await pageObjects.workflowEditor.graphCanvas.waitFor({ state: 'visible' });
    });

    test.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset(EXPERIMENTAL_FEATURES_SETTING);
    });

    test('a new trigger is on the canvas at once, and Remove trigger takes it out again', async ({
      pageObjects,
      page,
    }) => {
      const { workflowGraphAuthoring: authoring } = pageObjects;

      await authoring.openAddTriggerFromEmptyCanvas();
      await authoring.pickTrigger('Manual');

      await expect(page.testSubj.locator('workflowGraphNode-manual')).toBeVisible();
      await expect(page.testSubj.locator('workflowTriggerConfigPanelSave')).toHaveCount(0);
      await expect(page.testSubj.locator('workflowTriggerConfigPanelCancel')).toHaveCount(0);

      await page.testSubj.click('workflowTriggerConfigPanelRemoveTrigger');

      await expect(authoring.triggerPanel).toBeHidden();
      await expect(page.testSubj.locator('workflowGraphNode-manual')).toHaveCount(0);
      await expect(authoring.emptyAddTrigger).toBeVisible();
    });

    test('Reset trigger puts an existing trigger back as it was and closes the panel', async ({
      pageObjects,
      page,
    }) => {
      const { workflowGraphAuthoring: authoring } = pageObjects;
      const every = page.testSubj.locator('workflowTriggerConfigPanelEvery');
      const reset = page.testSubj.locator('workflowTriggerConfigPanelResetTrigger');

      await authoring.openAddTriggerFromEmptyCanvas();
      await authoring.pickTrigger('Scheduled');
      await authoring.closeTriggerPanel();
      await page.testSubj.locator('workflowGraphNode-scheduled').click();
      await authoring.triggerPanel.waitFor();
      const original = await every.inputValue();

      await expect(reset).toBeDisabled();
      await authoring.setTriggerEvery('2h');
      await expect(reset).toBeEnabled();
      await reset.click();

      await expect(authoring.triggerPanel).toBeHidden();
      await page.testSubj.locator('workflowGraphNode-scheduled').click();
      await expect(every).toHaveValue(original);
    });

    test('keeps what was edited when the panel is closed or the canvas is clicked', async ({
      pageObjects,
      page,
    }) => {
      const { workflowGraphAuthoring: authoring } = pageObjects;
      const every = page.testSubj.locator('workflowTriggerConfigPanelEvery');

      await authoring.openAddTriggerFromEmptyCanvas();
      await authoring.pickTrigger('Scheduled');
      await authoring.setTriggerEvery('2h');
      await authoring.closeTriggerPanel();
      await page.testSubj.locator('workflowGraphNode-scheduled').click();
      await expect(every).toHaveValue('2h');

      await authoring.setTriggerEvery('3h');
      // A click on the canvas outside the panel and the nodes.
      await page.testSubj.locator('workflowGraphCanvas').click({ position: { x: 24, y: 420 } });
      await expect(authoring.triggerPanel).toBeHidden();

      await page.testSubj.locator('workflowGraphNode-scheduled').click();
      await expect(every).toHaveValue('3h');
    });
  }
);

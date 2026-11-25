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
const JOIN_CONTROL = '[data-control-id="terminal:trigger-join"]';

test.describe(
  'Workflow graph — several triggers and no step yet',
  {
    tag: [
      ...tags.stateful.classic,
      ...tags.serverless.observability.complete,
      ...tags.serverless.security.complete,
    ],
  },
  () => {
    test.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.set({ [EXPERIMENTAL_FEATURES_SETTING]: true });
    });

    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.workflowEditor.gotoNewWorkflow();
      await pageObjects.workflowEditor.graphCanvas.waitFor({ state: 'visible' });
    });

    test.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset(EXPERIMENTAL_FEATURES_SETTING);
    });

    test('one trigger has its own stub and +, and a second joins into one + shared by both', async ({
      pageObjects,
      page,
    }) => {
      const { workflowGraphAuthoring: authoring } = pageObjects;

      await test.step('one trigger: its own + and nothing to join', async () => {
        await authoring.addTrigger('Manual', true);
        await authoring.closeTriggerPanel();

        await expect(authoring.wireControls()).toHaveCount(1);
        await expect(page.locator('[data-control-id="terminal:manual:step"]')).toBeVisible();
        await expect(authoring.triggerJoin()).toHaveCount(0);
      });

      await test.step('two triggers: one + for both, and a path from each into it', async () => {
        await authoring.addTrigger('Scheduled', false);
        await authoring.closeTriggerPanel();

        await expect(authoring.wireControls()).toHaveCount(1);
        await expect(page.locator(JOIN_CONTROL)).toBeVisible();
        await expect(authoring.triggerJoin().locator('path')).toHaveCount(2);
      });

      await test.step('a third trigger joins the same + with a path of its own', async () => {
        await authoring.addTrigger('Alert', false);
        await authoring.closeTriggerPanel();

        await expect(authoring.wireControls()).toHaveCount(1);
        await expect(page.locator(JOIN_CONTROL)).toBeVisible();
        await expect(authoring.triggerJoin().locator('path')).toHaveCount(3);
      });
    });

    test('the first step added from the joined + is wired to every trigger', async ({
      pageObjects,
      page,
    }) => {
      const { workflowGraphAuthoring: authoring } = pageObjects;

      await authoring.addTrigger('Manual', true);
      await authoring.closeTriggerPanel();
      await authoring.addTrigger('Scheduled', false);
      await authoring.closeTriggerPanel();
      await expect(page.locator(JOIN_CONTROL)).toBeVisible();

      await authoring.openAddStepFromWire({ mode: 'prepend-step' });
      await authoring.pickActionFromMenu('Check indices');
      await authoring.closeStepPanel();

      // The join gives way to the one a step has: both triggers drawn into it, with one + at its junction.
      await expect(authoring.triggerJoin()).toHaveCount(0);
      await expect(page.locator(JOIN_CONTROL)).toHaveCount(0);
      await expect(page.locator('.react-flow__edge')).toHaveCount(2);
      await expect(page.locator('[data-control-id^="wire:trigger-fanin:"]')).toHaveCount(1);
    });
  }
);

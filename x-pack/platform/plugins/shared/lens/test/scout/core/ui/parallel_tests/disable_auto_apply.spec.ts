/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { createLogstashLensEditorSuiteSetup, spaceTest } from '../fixtures';

spaceTest.describe('Lens disable auto-apply', { tag: '@local-stateful-classic' }, () => {
  const suiteSetup = createLogstashLensEditorSuiteSetup();

  spaceTest.beforeAll(suiteSetup.beforeAll);

  spaceTest.beforeEach(suiteSetup.beforeEach);

  spaceTest.afterAll(suiteSetup.afterAll);

  spaceTest(
    'toggles auto-apply and applies changes on demand',
    async ({ page, pageObjects: { lens } }) => {
      await spaceTest.step('persists the auto-apply setting across page refresh', async () => {
        await lens.openSettingsMenu();
        await expect(lens.autoApplyToggle).toHaveAttribute('aria-checked', 'true');
        await lens.toggleAutoApply();
        await expect(lens.autoApplyToggle).toHaveAttribute('aria-checked', 'false');
        await lens.closeSettingsMenu();

        await page.reload();
        await lens.waitForEmptyWorkspace();

        await lens.openSettingsMenu();
        await expect(lens.autoApplyToggle).toHaveAttribute('aria-checked', 'false');
        await lens.toggleAutoApply();
        await expect(lens.autoApplyToggle).toHaveAttribute('aria-checked', 'true');
        await lens.closeSettingsMenu();

        await page.reload();
        await lens.waitForEmptyWorkspace();

        await lens.openSettingsMenu();
        await expect(lens.autoApplyToggle).toHaveAttribute('aria-checked', 'true');
        await lens.toggleAutoApply();
        await expect(lens.autoApplyToggle).toHaveAttribute('aria-checked', 'false');
        await lens.closeSettingsMenu();
      });

      await spaceTest.step(
        'preserves the apply-changes button with a fullscreen datasource',
        async () => {
          await lens.configureDimension({
            dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
            operation: 'formula',
            formula: 'count()',
            keepOpen: true,
          });

          await lens.toggleFullscreen();
          await expect(lens.getApplyChangesButton('toolbar')).toBeVisible();

          await lens.toggleFullscreen();
          await lens.closeDimensionEditor();
        }
      );

      await spaceTest.step('applies changes only when "Apply" is clicked', async () => {
        await expect(
          page.testSubj.locator('lnsXY_xDimensionPanel > lns-empty-dimension')
        ).toBeVisible();

        await lens.configureDimension({
          dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
          operation: 'date_histogram',
          field: '@timestamp',
        });

        await lens.waitForWorkspaceWithApplyChangesPrompt();
        await lens.applyChanges('workspace');
        await lens.waitForVisualization('xyVisChart');
      });

      await spaceTest.step('hides the suggestions apply button once a change is made', async () => {
        await lens.switchToVisualization('lnsDatatable');
        await expect(lens.getApplyChangesButton('suggestions')).toBeVisible();

        await lens.applyChanges('suggestions');
        await expect(lens.getApplyChangesButton('suggestions')).toBeHidden();
      });
    }
  );
});

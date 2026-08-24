/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  createLogstashLensEditorSuiteSetup,
  createNewLens,
  LENS_EDITOR_VIEWPORT,
  spaceTest,
  testData,
} from '../../fixtures';

const VISUALIZE_ALL_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [{ names: ['logstash*'], privileges: ['read', 'view_index_metadata'] }],
  },
  kibana: [{ base: [], feature: { visualize: ['all'] }, spaces: ['*'] }],
};

const VISUALIZE_ALL_DASHBOARD_READ_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [{ names: ['logstash*'], privileges: ['read', 'view_index_metadata'] }],
  },
  kibana: [
    {
      base: [],
      feature: { visualize: ['all'], dashboard: ['read'] },
      spaces: ['*'],
    },
  ],
};

const ROLE_SCENARIOS = [
  { name: 'without dashboard access', role: VISUALIZE_ALL_ROLE },
  { name: 'with read-only dashboard access', role: VISUALIZE_ALL_DASHBOARD_READ_ROLE },
] as const;

spaceTest.describe('Lens add to dashboard capabilities', { tag: '@local-stateful-classic' }, () => {
  const suiteSetup = createLogstashLensEditorSuiteSetup({
    skipEmptyLensOpen: true,
  });

  spaceTest.beforeAll(suiteSetup.beforeAll);

  spaceTest.beforeEach(async ({ page }) => {
    await page.setViewportSize(LENS_EDITOR_VIEWPORT);
  });

  spaceTest.afterAll(suiteSetup.afterAll);

  for (const scenario of ROLE_SCENARIOS) {
    spaceTest(
      `${scenario.name} hides the dashboard flow prompt`,
      async ({ browserAuth, page, pageObjects }) => {
        await browserAuth.loginWithCustomRole(scenario.role);

        await spaceTest.step('open the Visualize library', async () => {
          await pageObjects.visualize.goto();
        });

        await spaceTest.step('hide the dashboard flow prompt', async () => {
          await expect(page.testSubj.locator('visualize-dashboard-flow-prompt')).toBeHidden();
        });
      }
    );

    // FTR tagged this case skipFIPS; Scout's local stateful lane does not run in FIPS mode.
    spaceTest(
      `${scenario.name} hides add-to-dashboard save options`,
      async ({ browserAuth, page, pageObjects }) => {
        const { lens } = pageObjects;
        await browserAuth.loginWithCustomRole(scenario.role);

        await spaceTest.step('build a new Lens visualization and open the save modal', async () => {
          await createNewLens(pageObjects);
          await expect(lens.metric.legacyMetricLabel).toHaveText(testData.AVERAGE_OF_BYTES);
          await expect(lens.metric.legacyMetricValue).toHaveText(/^[\d,.]+$/);
          await lens.saveButton.click();
          await expect(lens.saveModal).toBeVisible();
        });

        await spaceTest.step('hide add-to-dashboard options', async () => {
          await expect(page.testSubj.locator('add-to-dashboard-options')).toBeHidden();
        });
      }
    );
  }
});

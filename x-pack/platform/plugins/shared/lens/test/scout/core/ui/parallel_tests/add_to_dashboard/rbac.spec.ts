/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LENS_METRIC_STATE_DEFAULTS } from '@kbn/lens-common';
import type { KbnClient, KibanaRole } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  createLogstashLensEditorSuiteSetup,
  LENS_EDITOR_VIEWPORT,
  spaceTest,
} from '../../fixtures';

// RBAC (role-based access control) verifies that Lens capabilities reflect each user's privileges.
const createRbacLensVisualization = async (
  kbnClient: KbnClient,
  spaceId: string,
  dataViewId: string
): Promise<string> => {
  const { data } = await kbnClient.request<{ id: string }>({
    method: 'POST',
    path: `/s/${spaceId}/api/visualizations`,
    headers: {
      'kbn-xsrf': 'true',
      'elastic-api-version': '2023-10-31',
    },
    body: {
      type: 'metric',
      title: `Lens RBAC save options ${spaceId}`,
      description: '',
      ignore_global_filters: false,
      sampling: 1,
      data_source: { type: 'data_view_reference', ref_id: dataViewId },
      metrics: [
        {
          type: 'primary',
          operation: 'count',
          label: 'Count of records',
          empty_as_null: true,
        },
      ],
      styling: {
        primary: {
          labels: { alignment: LENS_METRIC_STATE_DEFAULTS.titlesTextAlign },
          value: { alignment: LENS_METRIC_STATE_DEFAULTS.primaryAlign, sizing: 'auto' },
        },
      },
    },
  });

  return data.id;
};

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
  let lensVisualizationId: string;

  spaceTest.beforeAll(async ({ apiServices, kbnClient, scoutSpace }) => {
    await suiteSetup.beforeAll({ apiServices, scoutSpace });
    lensVisualizationId = await createRbacLensVisualization(
      kbnClient,
      scoutSpace.id,
      suiteSetup.getDataViewId()
    );
  });

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

    spaceTest(
      `${scenario.name} hides add-to-dashboard save options`,
      async ({ browserAuth, page, pageObjects }) => {
        const { lens } = pageObjects;
        await browserAuth.loginWithCustomRole(scenario.role);

        await spaceTest.step('open the Lens save modal', async () => {
          await lens.workspace.openEditor(lensVisualizationId, 'mtrVis');
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

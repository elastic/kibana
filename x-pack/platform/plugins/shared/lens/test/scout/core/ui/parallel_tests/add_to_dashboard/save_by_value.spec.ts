/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import {
  createLogstashLensEditorSuiteSetup,
  getImportedSavedObjectId,
  runAddToDashboardSave,
  spaceTest,
  testData,
  type AddToDashboardSaveScenario,
} from '../../fixtures';

const BY_VALUE_SCENARIOS: AddToDashboardSaveScenario[] = [
  {
    name: 'new lens by value to a new dashboard',
    source: 'new',
    saveToLibrary: false,
    dashboard: 'new',
  },
  {
    name: 'existing lens by value to a new dashboard',
    source: 'existing',
    saveToLibrary: false,
    dashboard: 'new',
  },
  {
    name: 'new lens by value to an existing dashboard',
    source: 'new',
    saveToLibrary: false,
    dashboard: 'existing',
  },
  {
    name: 'existing lens by value to an existing dashboard',
    source: 'existing',
    saveToLibrary: false,
    dashboard: 'existing',
  },
];

spaceTest.describe(
  'Lens add to dashboard save by value',
  { tag: '@local-stateful-classic' },
  () => {
    const suiteSetup = createLogstashLensEditorSuiteSetup({
      loadLensArchives: true,
      skipEmptyLensOpen: true,
    });

    let artistMetricId: string;

    spaceTest.beforeAll(async ({ scoutSpace, apiServices }) => {
      const importedSavedObjects = await suiteSetup.beforeAll({ scoutSpace, apiServices });
      artistMetricId = getImportedSavedObjectId(
        importedSavedObjects,
        'lens',
        testData.LENS_BASIC_TITLES.ARTIST_METRIC
      );
    });

    spaceTest.beforeEach(suiteSetup.beforeEach);

    spaceTest.afterAll(suiteSetup.afterAll);

    for (const scenario of BY_VALUE_SCENARIOS) {
      spaceTest(
        `should allow ${scenario.name}`,
        async ({ pageObjects, scoutSpace, apiServices }) => {
          const { lens, dashboard } = pageObjects;

          const { lensTitle, expectedLabel, expectedPanelCount } = await spaceTest.step(
            'open Lens and save by value to a dashboard',
            async () => {
              return runAddToDashboardSave({
                pageObjects,
                apiServices,
                spaceId: scoutSpace.id,
                artistMetricId,
                scenario,
              });
            }
          );

          await spaceTest.step('the dashboard shows the panel without a library link', async () => {
            await dashboard.waitForRenderComplete();
            await dashboard.expectPanelCount(expectedPanelCount);

            await expect(lens.metric.legacyMetricLabel).toHaveText(expectedLabel);
            // Backend-computed aggregation: assert it renders as a formatted number rather
            // than pinning the exact FTR figure.
            await expect(lens.metric.legacyMetricValue).toHaveText(/^[\d,.]+$/);

            await dashboard.expectNotLinkedToLibrary(lensTitle);
          });
        }
      );
    }
  }
);

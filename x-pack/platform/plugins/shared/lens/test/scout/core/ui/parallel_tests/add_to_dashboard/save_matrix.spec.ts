/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import {
  createDashboardWithLibraryPanel,
  createLogstashLensEditorSuiteSetup,
  createNewLens,
  spaceTest,
  testData,
} from '../../fixtures';

const SAVE_MATRIX = [
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
  {
    name: 'new lens by reference to a new dashboard',
    source: 'new',
    saveToLibrary: true,
    dashboard: 'new',
  },
  {
    name: 'existing lens by reference to a new dashboard',
    source: 'existing',
    saveToLibrary: true,
    dashboard: 'new',
  },
  {
    name: 'new lens by reference to an existing dashboard',
    source: 'new',
    saveToLibrary: true,
    dashboard: 'existing',
  },
  {
    name: 'existing lens by reference to an existing dashboard',
    source: 'existing',
    saveToLibrary: true,
    dashboard: 'existing',
  },
] as const;

spaceTest.describe('Lens add to dashboard save matrix', { tag: '@local-stateful-classic' }, () => {
  const suiteSetup = createLogstashLensEditorSuiteSetup({
    loadLensArchives: true,
    skipEmptyLensOpen: true,
  });

  spaceTest.beforeAll(suiteSetup.beforeAll);

  spaceTest.beforeEach(suiteSetup.beforeEach);

  spaceTest.afterAll(suiteSetup.afterAll);

  for (const scenario of SAVE_MATRIX) {
    spaceTest(`should allow ${scenario.name}`, async ({ pageObjects, scoutSpace }) => {
      const { visualize, lens, dashboard } = pageObjects;
      // Include dashboard target so by-ref library saves do not collide across cases.
      const lensTitle = `Lens ${scenario.source} ${scenario.saveToLibrary ? 'ref' : 'val'} ${
        scenario.dashboard
      } ${scoutSpace.id}`;
      const dashboardTitle = `Dash ${scenario.source} ${scenario.saveToLibrary ? 'ref' : 'val'} ${
        scenario.dashboard
      } ${scoutSpace.id}`;
      const expectedLabel =
        scenario.source === 'new' ? testData.AVERAGE_OF_BYTES : testData.MAX_BYTES_LABEL;
      const expectedPanelCount = scenario.dashboard === 'existing' ? 2 : 1;

      if (scenario.dashboard === 'existing') {
        await spaceTest.step('seed an existing dashboard with a library panel', async () => {
          await createDashboardWithLibraryPanel(
            pageObjects,
            dashboardTitle,
            testData.LENS_BASIC_TITLES.XY_VIS
          );
        });
      }

      await spaceTest.step('open the lens editor', async () => {
        if (scenario.source === 'new') {
          await createNewLens(pageObjects);
        } else {
          await visualize.goto();
          await visualize.openSavedVisualization(testData.LENS_BASIC_TITLES.ARTIST_METRIC, {
            waitFor: 'lens',
          });
          await lens.waitForVisualization('legacyMtrVis');
        }
      });

      await spaceTest.step('save to dashboard from the modal', async () => {
        if (scenario.dashboard === 'existing') {
          await lens.saveToDashboard(lensTitle, {
            addToDashboard: 'existing',
            dashboardTitle,
            saveAsNew: scenario.source === 'existing',
            saveToLibrary: scenario.saveToLibrary,
          });
        } else {
          await lens.saveToDashboard(lensTitle, {
            addToDashboard: 'new',
            saveAsNew: scenario.source === 'existing',
            saveToLibrary: scenario.saveToLibrary,
          });
        }
      });

      await spaceTest.step(
        'the dashboard shows the panel with the expected library link',
        async () => {
          await dashboard.waitForRenderComplete();
          await dashboard.expectPanelCount(expectedPanelCount);

          const { title, value } = await lens.metric.getLegacyMetricData();
          expect(title).toBe(expectedLabel);
          // Backend-computed aggregation: assert it renders as a formatted number rather
          // than pinning the exact FTR figure.
          expect(value).toMatch(/^[\d,.]+$/);

          if (scenario.saveToLibrary) {
            await dashboard.expectLinkedToLibrary(lensTitle);
          } else {
            await dashboard.expectNotLinkedToLibrary(lensTitle);
          }
        }
      );
    });
  }
});

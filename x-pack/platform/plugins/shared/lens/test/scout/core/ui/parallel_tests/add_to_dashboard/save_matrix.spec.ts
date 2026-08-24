/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  createLogstashLensEditorSuiteSetup,
  createNewLens,
  spaceTest,
  testData,
  type LensPageObjects,
} from '../../fixtures';

type VisualizeAndLens = Pick<LensPageObjects, 'visualize' | 'lens'>;

interface AddToDashboardSaveScenario {
  name: string;
  source: 'new' | 'existing';
  saveToLibrary: boolean;
  dashboard: 'new' | 'existing';
}

interface AddToDashboardSaveResult {
  lensTitle: string;
  expectedLabel: string;
  expectedPanelCount: number;
}

/**
 * Creates a dashboard that already contains one panel.
 * Seed for "add Lens to an existing dashboard" cases — API, not Dashboard UI.
 * Markdown is a valid Dashboard API panel type; `type: 'lens'` is not.
 */
async function createDashboardWithSeedPanel(
  apiServices: { dashboard: { create: (body: unknown, spaceId?: string) => Promise<string> } },
  spaceId: string,
  dashboardTitle: string
): Promise<void> {
  await apiServices.dashboard.create(
    {
      title: dashboardTitle,
      panels: [
        {
          type: 'markdown',
          grid: { x: 0, y: 0, w: 24, h: 15 },
          config: { content: 'seed panel' },
        },
      ],
    },
    spaceId
  );
}

async function findLensIdByTitle(
  kbnClient: KbnClient,
  spaceId: string,
  title: string
): Promise<string> {
  const { saved_objects: savedObjects } = await kbnClient.savedObjects.find<{ title: string }>({
    type: 'lens',
    space: spaceId,
  });
  const lens = savedObjects.find((savedObject) => savedObject.attributes.title === title);
  if (!lens) {
    throw new Error(`Lens "${title}" was not found in space ${spaceId}`);
  }
  return lens.id;
}

/** Opens a new average-of-bytes metric or the archived Artist metric. */
async function openLensForSaveMatrix(
  pageObjects: VisualizeAndLens,
  artistMetricId: string,
  source: 'new' | 'existing'
): Promise<void> {
  if (source === 'new') {
    await createNewLens(pageObjects);
    return;
  }

  await pageObjects.lens.workspace.openEditor(artistMetricId, 'legacyMtrVis');
}

/**
 * Seeds (when needed), opens Lens, and saves to a new or existing dashboard.
 * Scenario branches live here so the spec body stays linear.
 */
async function runAddToDashboardSave({
  pageObjects,
  apiServices,
  spaceId,
  artistMetricId,
  scenario,
}: {
  pageObjects: VisualizeAndLens;
  apiServices: { dashboard: { create: (body: unknown, spaceId?: string) => Promise<string> } };
  spaceId: string;
  artistMetricId: string;
  scenario: AddToDashboardSaveScenario;
}): Promise<AddToDashboardSaveResult> {
  const refOrVal = scenario.saveToLibrary ? 'ref' : 'val';
  const lensTitle = `Lens ${scenario.source} ${refOrVal} ${scenario.dashboard} ${spaceId}`;
  const dashboardTitle = `Dash ${scenario.source} ${refOrVal} ${scenario.dashboard} ${spaceId}`;
  const saveOptions = {
    saveAsNew: scenario.source === 'existing',
    saveToLibrary: scenario.saveToLibrary,
  };

  if (scenario.dashboard === 'existing') {
    await createDashboardWithSeedPanel(apiServices, spaceId, dashboardTitle);
    await openLensForSaveMatrix(pageObjects, artistMetricId, scenario.source);
    await pageObjects.lens.saveToExistingDashboard(lensTitle, dashboardTitle, saveOptions);
  } else {
    await openLensForSaveMatrix(pageObjects, artistMetricId, scenario.source);
    await pageObjects.lens.saveToNewDashboard(lensTitle, saveOptions);
  }

  return {
    lensTitle,
    expectedLabel: scenario.source === 'new' ? testData.AVERAGE_OF_BYTES : testData.MAX_BYTES_LABEL,
    expectedPanelCount: scenario.dashboard === 'existing' ? 2 : 1,
  };
}

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

const BY_REFERENCE_SCENARIOS: AddToDashboardSaveScenario[] = [
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
];

spaceTest.describe('Lens add to dashboard save matrix', { tag: '@local-stateful-classic' }, () => {
  const suiteSetup = createLogstashLensEditorSuiteSetup({
    loadLensArchives: true,
    skipEmptyLensOpen: true,
  });

  let artistMetricId: string;

  spaceTest.beforeAll(async ({ kbnClient, scoutSpace, apiServices }) => {
    await suiteSetup.beforeAll({ scoutSpace, apiServices });
    artistMetricId = await findLensIdByTitle(
      kbnClient,
      scoutSpace.id,
      testData.LENS_BASIC_TITLES.ARTIST_METRIC
    );
  });

  spaceTest.beforeEach(suiteSetup.beforeEach);

  spaceTest.afterAll(suiteSetup.afterAll);

  for (const scenario of BY_VALUE_SCENARIOS) {
    spaceTest(`should allow ${scenario.name}`, async ({ pageObjects, scoutSpace, apiServices }) => {
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
    });
  }

  for (const scenario of BY_REFERENCE_SCENARIOS) {
    spaceTest(`should allow ${scenario.name}`, async ({ pageObjects, scoutSpace, apiServices }) => {
      const { lens, dashboard } = pageObjects;

      const { lensTitle, expectedLabel, expectedPanelCount } = await spaceTest.step(
        'open Lens and save by reference to a dashboard',
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

      await spaceTest.step('the dashboard shows the panel linked to the library', async () => {
        await dashboard.waitForRenderComplete();
        await dashboard.expectPanelCount(expectedPanelCount);

        await expect(lens.metric.legacyMetricLabel).toHaveText(expectedLabel);
        await expect(lens.metric.legacyMetricValue).toHaveText(/^[\d,.]+$/);

        await dashboard.expectLinkedToLibrary(lensTitle);
      });
    });
  }
});

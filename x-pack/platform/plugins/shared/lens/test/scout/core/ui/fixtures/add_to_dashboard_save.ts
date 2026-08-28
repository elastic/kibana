/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiServicesFixture } from '@kbn/scout';
import { createNewLens, testData, type LensPageObjects } from '../../../common/ui/fixtures';

type VisualizeAndLens = Pick<LensPageObjects, 'visualize' | 'lens'>;
type DashboardApiServices = Pick<ApiServicesFixture, 'dashboard'>;

export interface AddToDashboardSaveScenario {
  name: string;
  source: 'new' | 'existing';
  saveToLibrary: boolean;
  dashboard: 'new' | 'existing';
}

export interface AddToDashboardSaveResult {
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
  apiServices: DashboardApiServices,
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
export async function runAddToDashboardSave({
  pageObjects,
  apiServices,
  spaceId,
  artistMetricId,
  scenario,
}: {
  pageObjects: VisualizeAndLens;
  apiServices: DashboardApiServices;
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

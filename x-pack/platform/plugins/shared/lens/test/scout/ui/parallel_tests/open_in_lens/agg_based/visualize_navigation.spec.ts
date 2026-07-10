/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { setupLogstashOpenInLensDefaults, testData } from '../../../fixtures';

const TIMESTAMP_X_AXIS_DIMENSION = {
  dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
  operation: 'date_histogram',
  field: '@timestamp',
} as const;

spaceTest.describe(
  'Lens open in Lens — agg-based Visualize navigation',
  { tag: tags.stateful.classic },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.load(
        testData.KBN_ARCHIVE_PATHS.OPEN_IN_LENS.AGG_BASED.NAVIGATION
      );
      await setupLogstashOpenInLensDefaults(scoutSpace);
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      const { visualize } = pageObjects;

      await browserAuth.loginAsPrivilegedUser();
      await visualize.goto();
      await visualize.openSavedVisualization(
        testData.VISUALIZATION_TITLES.OPEN_IN_LENS.AGG_BASED.NAVIGATION_LINE
      );
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'dateFormat:tz', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'should let the user return back to Visualize if no changes were made',
      async ({ pageObjects: { visualize, lens } }) => {
        await visualize.clickEditInLensButton();
        await lens.waitForVisualization('xyVisChart');
        expect(await lens.getLayerCount()).toBe(1);

        await lens.goBackToPreviousApp();
        await visualize.expectEditInLensButtonVisible();
      }
    );

    spaceTest(
      'should let the user return back to Visualize but show a warning modal if changes happened in Lens',
      async ({ pageObjects: { visualize, lens } }) => {
        await visualize.clickEditInLensButton();
        await lens.waitForVisualization('xyVisChart');
        expect(await lens.getLayerCount()).toBe(1);

        await lens.configureDimension(TIMESTAMP_X_AXIS_DIMENSION);

        await lens.goBackToPreviousApp();
        await lens.confirmDiscardChangesModal();
        await visualize.expectEditInLensButtonVisible();
      }
    );

    spaceTest(
      'should let the user return back to Visualize with no modal if changes have been saved in Lens',
      async ({ pageObjects: { visualize, lens }, scoutSpace }) => {
        await visualize.clickEditInLensButton();
        await lens.waitForVisualization('xyVisChart');
        expect(await lens.getLayerCount()).toBe(1);

        await lens.configureDimension(TIMESTAMP_X_AXIS_DIMENSION);

        await lens.save(`Migrated Viz saved in Lens ${scoutSpace.id}`, { addToDashboard: 'none' });
        await lens.goBackToPreviousApp();
        await visualize.expectEditInLensButtonVisible();
      }
    );
  }
);
